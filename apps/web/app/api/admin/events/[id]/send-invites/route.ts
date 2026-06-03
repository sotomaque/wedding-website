import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getEmailFromAddress } from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { weddingUrl } from "@/lib/url";
import { formatEventDate, formatEventTime } from "@/lib/utils/event-format";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Send event invitation emails
 * @description Send invitation emails to selected guests for this event, optionally using a Resend template
 * @pathParams IdParams
 * @body SendEventInvitesBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { guestIds } = body;

    if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json(
        { error: "Guest IDs array is required" },
        { status: 400 },
      );
    }

    // Check if email is configured
    if (!getResendClient()) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    // Verify event exists and belongs to this wedding
    const event = await db.event.findUnique({
      where: { id: eventId, weddingId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isDefault) {
      return NextResponse.json(
        { error: "Cannot send event invites for default events" },
        { status: 400 },
      );
    }

    // Get all invited guests that match the provided IDs
    const invites = await db.guestEventInvite.findMany({
      where: {
        eventId,
        weddingId,
        guest: { id: { in: guestIds } },
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            inviteCode: true,
            preferredLanguage: true,
          },
        },
      },
    });

    if (invites.length === 0) {
      return NextResponse.json(
        { error: "No invited guests found with the provided IDs" },
        { status: 404 },
      );
    }

    // Validate all guests have emails
    const guestsWithoutEmail = invites.filter(
      (i) => !i.guest.email?.includes("@"),
    );
    if (guestsWithoutEmail.length > 0) {
      return NextResponse.json(
        {
          error: `${guestsWithoutEmail.length} guest(s) don't have valid email addresses`,
          guestsWithoutEmail: guestsWithoutEmail.map((i) => i.guest.firstName),
        },
        { status: 400 },
      );
    }

    const settings = await getWeddingSettings();
    const eventTime = formatEventTime(event.startTime, event.endTime);
    const eventDateStr = formatEventDate(event.eventDate);

    // Send emails to all guests
    let sentCount = 0;
    const errors: { guest: string; error: string }[] = [];

    for (const invite of invites) {
      const rsvpUrl = `${weddingUrl(settings.slug, "/events/rsvp")}?code=${invite.guest.inviteCode}&event=${eventId}`;

      try {
        const rendered = await renderEmailTemplate(
          weddingId,
          "event_invitation",
          {
            GUEST_NAME:
              `${invite.guest.firstName} ${invite.guest.lastName || ""}`.trim(),
            COUPLE_NAMES: settings.coupleName,
            EVENT_NAME: event.name,
            EVENT_DESCRIPTION: event.description || "",
            EVENT_DATE: eventDateStr || "",
            EVENT_TIME: eventTime || "",
            LOCATION_NAME: event.locationName || "",
            LOCATION_ADDRESS: event.locationAddress || "",
            INVITE_CODE: invite.guest.inviteCode ?? "",
            RSVP_URL: rsvpUrl,
            BACKGROUND_IMAGE_URL: "",
          },
          invite.guest.preferredLanguage ?? settings.defaultLanguage,
        );

        if (!rendered) {
          console.warn(
            "Event invitation email skipped - template inactive or not found",
          );
          continue;
        }

        const result = await sendEmail({
          from: getEmailFromAddress(settings),
          to: invite.guest.email as string,
          subject: rendered.subject,
          html: rendered.html,
          log: {
            weddingId,
            guestId: invite.guest.id,
            type: "event_invitation",
          },
        });

        if (result.error) {
          throw result.error;
        }

        // Update invite record with email sent status
        await db.guestEventInvite.update({
          where: { id: invite.id },
          data: {
            emailSent: true,
            emailSentAt: new Date().toISOString(),
            emailResendCount: (invite.emailResendCount || 0) + 1,
          },
        });

        sentCount++;
      } catch (emailError) {
        console.error(
          `Error sending email to ${invite.guest.email}:`,
          emailError,
        );
        errors.push({
          guest:
            `${invite.guest.firstName} ${invite.guest.lastName || ""}`.trim(),
          error: "Failed to send email",
        });
      }
    }

    if (sentCount === 0) {
      return NextResponse.json(
        { error: "Failed to send any emails", errors },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalRequested: invites.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/events/[id]/send-invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
