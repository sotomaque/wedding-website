import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
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
    const weddingId = await getWeddingId();

    // Find guest with this invite code
    const guest = await db.guest.findFirst({
      where: {
        inviteCode: normalizedCode,
        isPlusOne: false, // Only match primary guests
        weddingId,
      },
    });

    if (!guest) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    // Verify event exists
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if guest is invited to this event
    const invite = await db.guestEventInvite.findFirst({
      where: {
        guestId: guest.id,
        eventId: eventId,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "You are not invited to this event" },
        { status: 403 },
      );
    }

    // Update the RSVP status
    const rsvpStatus = attending ? "yes" : "no";
    await db.guestEventInvite.update({
      where: { id: invite.id },
      data: { rsvpStatus },
    });

    // Send notification email to admins
    try {
      const settings = await getWeddingSettings();
      const adminEmails = getNotificationRecipients(settings);
      if (getResendClient() && adminEmails.length > 0) {
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
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
          },
          inviteCode: guest.inviteCode ?? "",
          eventName: event.name,
          attending,
          submittedAt,
        });

        await sendEmail({
          from: getEmailFromAddress(settings, "Wedding RSVP"),
          to: adminEmails,
          subject: `Event RSVP: ${guest.firstName} ${attending ? "is attending" : "declined"} ${event.name}`,
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
