import type { Prisma } from "@prisma/client";
import { after, type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { canAccommodate } from "@/lib/utils/event-capacity";
import { generateInviteCode } from "@/lib/utils/invite-code";
import { publicEventRsvpSchema } from "@/lib/validations/event-rsvp";

/** Sentinel thrown inside the capacity transaction to roll it back cleanly. */
class CapacityFullError extends Error {}

/**
 * Public per-event RSVP via a shareable link. Two paths:
 *   - "code": an existing guest enters their invite code.
 *   - "name": a new invitee types their name and self-registers (a guest record
 *     is created, flagged `selfRegistered` for admin review, with a fresh code).
 *
 * Either path may bring additional household members (plus-ones / kids), who
 * RSVP with the same status and each count toward the event's capacity.
 *
 * Capacity-limited events stop accepting new attendees once full — the whole
 * party must fit. Declines and guests re-confirming an existing "yes" are never
 * blocked (their existing seats are excluded from the count).
 *
 * @description Submit a public per-event RSVP (by invite code or by name)
 * @body PublicEventRsvpBody
 * @response 200:SuccessResponse
 * @tag Events RSVP
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = publicEventRsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // Resolve the event from its public token (globally unique).
    const event = await db.event.findUnique({
      where: { publicRsvpToken: input.token },
    });
    if (!event) {
      return NextResponse.json(
        { error: "This RSVP link is no longer valid." },
        { status: 404 },
      );
    }
    const weddingId = event.weddingId;
    const rsvpStatus = input.attending ? "yes" : "no";

    // The couple can close a link without deleting it. A decline is still
    // allowed (so someone can bow out), but new acceptances are rejected.
    if (!event.publicRsvpEnabled && input.attending) {
      return NextResponse.json(
        { error: "RSVPs for this event are closed." },
        { status: 403 },
      );
    }

    // Household members only ride along on an acceptance.
    const additional = input.attending
      ? (input.additionalGuests ?? []).map((a) => ({
          firstName: a.firstName.trim(),
          lastName: a.lastName?.trim() || null,
        }))
      : [];

    // --- Resolve the primary guest (existing id, or data to create) ---
    let primaryId: string | null = null;
    let primaryToCreate: Prisma.GuestCreateInput | null = null;
    let generatedCode: string | null = null;
    let primaryEmailInfo = {
      firstName: "",
      lastName: null as string | null,
      email: null as string | null,
      inviteCode: null as string | null,
    };

    if (input.mode === "code") {
      const found = await db.guest.findFirst({
        where: {
          inviteCode: input.code.toUpperCase().trim(),
          isPlusOne: false,
          weddingId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          inviteCode: true,
        },
      });
      if (!found) {
        return NextResponse.json(
          { error: "We couldn't find that invite code." },
          { status: 404 },
        );
      }
      primaryId = found.id;
      primaryEmailInfo = found;
    } else {
      const firstName = input.firstName.trim();
      const lastName = input.lastName?.trim() || null;
      const email = input.email?.trim() || null;

      // Reuse an existing matching guest (case-insensitive name) to avoid a
      // duplicate when someone re-RSVPs by name.
      const existing = await db.guest.findFirst({
        where: {
          weddingId,
          firstName: { equals: firstName, mode: "insensitive" },
          lastName: lastName ? { equals: lastName, mode: "insensitive" } : null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          inviteCode: true,
        },
      });

      if (existing) {
        primaryId = existing.id;
        primaryEmailInfo = existing;
      } else {
        // Mint a unique invite code so the self-registered guest can manage
        // their RSVP later.
        let code = generateInviteCode();
        for (let i = 0; i < 10; i++) {
          const clash = await db.guest.findFirst({
            where: { inviteCode: code, weddingId },
            select: { id: true },
          });
          if (!clash) break;
          code = generateInviteCode();
        }
        generatedCode = code;
        primaryToCreate = {
          firstName,
          lastName,
          email,
          inviteCode: code,
          selfRegistered: true,
          list: "c",
          wedding: { connect: { id: weddingId } },
        };
        primaryEmailInfo = { firstName, lastName, email, inviteCode: code };
      }
    }

    // --- Resolve additional guests (reuse matching plus-ones if the primary
    // already exists, otherwise create them) ---
    const additionalExistingIds: string[] = [];
    const additionalToCreate: { firstName: string; lastName: string | null }[] =
      [];
    for (const a of additional) {
      let matchedId: string | null = null;
      if (primaryId) {
        const match = await db.guest.findFirst({
          where: {
            weddingId,
            primaryGuestId: primaryId,
            isPlusOne: true,
            firstName: { equals: a.firstName, mode: "insensitive" },
            lastName: a.lastName
              ? { equals: a.lastName, mode: "insensitive" }
              : null,
          },
          select: { id: true },
        });
        matchedId = match?.id ?? null;
      }
      if (matchedId) additionalExistingIds.push(matchedId);
      else additionalToCreate.push(a);
    }

    // Seats this party already holds (excluded from the "others" count) and the
    // number of seats it needs once everyone is confirmed.
    const partyExistingIds = [
      ...(primaryId ? [primaryId] : []),
      ...additionalExistingIds,
    ];
    const requested = input.attending ? 1 + additional.length : 0;

    let resolvedPrimaryId = primaryId;
    try {
      await db.$transaction(async (tx) => {
        if (input.attending && event.capacity != null) {
          // Serialize concurrent RSVPs to this event on its row.
          await tx.$queryRaw`SELECT id FROM events WHERE id = ${event.id}::uuid FOR UPDATE`;
          const where: Prisma.GuestEventInviteWhereInput = {
            eventId: event.id,
            rsvpStatus: "yes",
          };
          if (partyExistingIds.length > 0) {
            where.guestId = { notIn: partyExistingIds };
          }
          const confirmedOthers = await tx.guestEventInvite.count({ where });
          if (!canAccommodate(confirmedOthers, requested, event.capacity)) {
            throw new CapacityFullError();
          }
        }

        // Create the primary now (inside the tx) so a capacity failure doesn't
        // leave an orphan self-registered guest.
        if (!resolvedPrimaryId && primaryToCreate) {
          const created = await tx.guest.create({
            data: primaryToCreate,
            select: { id: true },
          });
          resolvedPrimaryId = created.id;
        }
        if (!resolvedPrimaryId) {
          // Shouldn't happen — either we found a primary or had data to create.
          throw new Error("No primary guest to RSVP");
        }

        const partyIds = [resolvedPrimaryId, ...additionalExistingIds];
        for (const a of additionalToCreate) {
          const created = await tx.guest.create({
            data: {
              firstName: a.firstName,
              lastName: a.lastName,
              isPlusOne: true,
              selfRegistered: true,
              list: "c",
              wedding: { connect: { id: weddingId } },
              primaryGuest: { connect: { id: resolvedPrimaryId } },
            },
            select: { id: true },
          });
          partyIds.push(created.id);
        }

        for (const guestId of partyIds) {
          await tx.guestEventInvite.upsert({
            where: { guestId_eventId: { guestId, eventId: event.id } },
            create: { guestId, eventId: event.id, weddingId, rsvpStatus },
            update: { rsvpStatus },
          });
        }
      });
    } catch (txError) {
      if (txError instanceof CapacityFullError) {
        return NextResponse.json(
          { error: "This event has reached capacity.", full: true },
          { status: 409 },
        );
      }
      throw txError;
    }

    const partyCount = 1 + additional.length;

    // Notify the couple in the background — best-effort, never blocks the RSVP.
    after(async () => {
      try {
        if (!getResendClient()) return;
        const settings = await getWeddingSettings();
        const recipients = getNotificationRecipients(settings);
        if (recipients.length === 0) return;

        const partySuffix =
          additional.length > 0 ? ` (+${additional.length})` : "";
        const rendered = await renderEmailTemplate(
          weddingId,
          "event_rsvp_notification",
          {
            GUEST_NAME:
              `${primaryEmailInfo.firstName} ${primaryEmailInfo.lastName || ""}`.trim() +
              partySuffix,
            GUEST_EMAIL: primaryEmailInfo.email || "No email provided",
            INVITE_CODE: primaryEmailInfo.inviteCode ?? "",
            EVENT_NAME: event.name,
            STATUS: input.attending ? "Attending" : "Not Attending",
            STATUS_COLOR: input.attending ? "#48bb78" : "#f56565",
            STATUS_EMOJI: input.attending ? "✅" : "❌",
            SUBMITTED_AT: new Date().toLocaleString("en-US", {
              timeZone: settings.timezone || "America/Los_Angeles",
              dateStyle: "medium",
              timeStyle: "short",
            }),
          },
          settings.defaultLanguage,
        );
        if (rendered) {
          await sendEmail({
            from: getEmailFromAddress(settings, "Wedding RSVP"),
            to: recipients,
            subject: rendered.subject,
            html: rendered.html,
            log: {
              weddingId,
              guestId: resolvedPrimaryId ?? undefined,
              type: "event_rsvp_notification",
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending event RSVP notification:", emailError);
      }
    });

    return NextResponse.json({
      success: true,
      rsvpStatus,
      partyCount,
      // Returned only for first-time self-registrations so the page can show
      // the guest the code they'll use to manage their RSVP.
      inviteCode: generatedCode,
      message: input.attending
        ? "Thank you for confirming your attendance!"
        : "Thank you for letting us know.",
    });
  } catch (error) {
    console.error("Error in POST /api/events/rsvp/public:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
