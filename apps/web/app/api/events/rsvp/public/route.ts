import { after, type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { isEventFull } from "@/lib/utils/event-capacity";
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
 * Capacity-limited events stop accepting new *attending* RSVPs once full
 * (declines and already-confirmed guests are never blocked).
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

    // Resolve (or create) the guest.
    let guest: {
      id: string;
      firstName: string;
      lastName: string | null;
      email: string | null;
      inviteCode: string | null;
    };
    let generatedCode: string | null = null;

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
      guest = found;
    } else {
      const firstName = input.firstName.trim();
      const lastName = input.lastName?.trim() || null;
      const email = input.email?.trim() || null;

      // Reuse an existing matching guest (case-insensitive name) to avoid
      // creating a duplicate when someone re-RSVPs by name.
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
        guest = existing;
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
        guest = await db.guest.create({
          data: {
            firstName,
            lastName,
            email,
            inviteCode: code,
            weddingId,
            selfRegistered: true,
            list: "c",
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            inviteCode: true,
          },
        });
      }
    }

    // Capacity gate + invite upsert run in one transaction that locks the event
    // row first (SELECT … FOR UPDATE), so concurrent RSVPs to a capacity-limited
    // event serialize on that row — two requests can't both read "not full" and
    // both confirm. Only *new* attendees are gated; declines and guests
    // re-confirming an existing "yes" are never blocked (the count excludes the
    // current guest).
    try {
      await db.$transaction(async (tx) => {
        if (input.attending && event.capacity != null) {
          await tx.$queryRaw`SELECT id FROM events WHERE id = ${event.id}::uuid FOR UPDATE`;
          const confirmedOthers = await tx.guestEventInvite.count({
            where: {
              eventId: event.id,
              rsvpStatus: "yes",
              guestId: { not: guest.id },
            },
          });
          if (isEventFull(confirmedOthers, event.capacity)) {
            throw new CapacityFullError();
          }
        }

        await tx.guestEventInvite.upsert({
          where: { guestId_eventId: { guestId: guest.id, eventId: event.id } },
          create: {
            guestId: guest.id,
            eventId: event.id,
            weddingId,
            rsvpStatus,
          },
          update: { rsvpStatus },
        });
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

    // Notify the couple in the background — best-effort, never blocks the RSVP.
    after(async () => {
      try {
        if (!getResendClient()) return;
        const settings = await getWeddingSettings();
        const recipients = getNotificationRecipients(settings);
        if (recipients.length === 0) return;

        const rendered = await renderEmailTemplate(
          weddingId,
          "event_rsvp_notification",
          {
            GUEST_NAME: `${guest.firstName} ${guest.lastName || ""}`.trim(),
            GUEST_EMAIL: guest.email || "No email provided",
            INVITE_CODE: guest.inviteCode ?? "",
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
              guestId: guest.id,
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
