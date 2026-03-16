import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { getEventRsvpNotificationEmail } from "@/lib/email/templates/event-rsvp-notification";

/**
 * Submit event RSVP
 * @description Submit an RSVP response for a specific event, confirming or declining attendance
 * @body EventRsvpSubmitBody
 * @response 200:SuccessResponse
 * @tag Events RSVP
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, eventId, attending } = body;

    if (!inviteCode || !eventId || typeof attending !== "boolean") {
      return NextResponse.json(
        { error: "Invite code, event ID, and attending status are required" },
        { status: 400 },
      );
    }

    // Normalize code to uppercase
    const normalizedCode = inviteCode.toUpperCase().trim();

    // Find guest with this invite code
    const guest = await db
      .selectFrom("guests")
      .selectAll()
      .where("invite_code", "=", normalizedCode)
      .where("is_plus_one", "=", false) // Only match primary guests
      .executeTakeFirst();

    if (!guest) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirst();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if guest is invited to this event
    const invite = await db
      .selectFrom("guest_event_invites")
      .selectAll()
      .where("guest_id", "=", guest.id)
      .where("event_id", "=", eventId)
      .executeTakeFirst();

    if (!invite) {
      return NextResponse.json(
        { error: "You are not invited to this event" },
        { status: 403 },
      );
    }

    // Update the RSVP status
    const rsvpStatus = attending ? "yes" : "no";
    await db
      .updateTable("guest_event_invites")
      .set({ rsvp_status: rsvpStatus })
      .where("id", "=", invite.id)
      .execute();

    // Send notification email to admins
    try {
      if (getResendClient() && env.RSVP_EMAIL) {
        const adminEmails = env.RSVP_EMAIL.split(",").map((e) => e.trim());

        const submittedAt = new Date().toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        const emailHtml = getEventRsvpNotificationEmail({
          guest: {
            firstName: guest.first_name,
            lastName: guest.last_name,
            email: guest.email,
          },
          inviteCode: guest.invite_code,
          eventName: event.name,
          attending,
          submittedAt,
        });

        await sendEmail({
          from: "Wedding RSVP <rsvp@helen-and-enrique.com>",
          to: adminEmails,
          subject: `Event RSVP: ${guest.first_name} ${attending ? "is attending" : "declined"} ${event.name}`,
          html: emailHtml,
        });
      }
    } catch (emailError) {
      // Log but don't fail the RSVP submission if email fails
      console.error("Error sending RSVP notification email:", emailError);
    }

    return NextResponse.json({
      success: true,
      rsvpStatus,
      message: attending
        ? "Thank you for confirming your attendance!"
        : "Thank you for letting us know.",
    });
  } catch (error) {
    console.error("Error in POST /api/events/rsvp/submit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
