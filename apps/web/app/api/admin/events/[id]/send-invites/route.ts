import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { getEventInvitationEmail } from "@/lib/email/templates/event-invitation";

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
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { guestIds, templateId, subject: customSubject } = body;

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

    // Verify event exists and is not a default event
    const event = await db.event.findUnique({
      where: { id: eventId },
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

    const weddingId = await getWeddingId();

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

    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Format event time if available
    let eventTime: string | null = null;
    if (event.startTime) {
      const startTimeStr =
        event.startTime instanceof Date
          ? event.startTime.toISOString()
          : String(event.startTime);
      const [hours, minutes] = startTimeStr.split(":");
      const hour = Number.parseInt(hours || "0", 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      eventTime = `${hour12}:${minutes} ${ampm}`;
      if (event.endTime) {
        const endTimeStr =
          event.endTime instanceof Date
            ? event.endTime.toISOString()
            : String(event.endTime);
        const [endHours, endMinutes] = endTimeStr.split(":");
        const endHour = Number.parseInt(endHours || "0", 10);
        const endAmpm = endHour >= 12 ? "PM" : "AM";
        const endHour12 = endHour % 12 || 12;
        eventTime += ` - ${endHour12}:${endMinutes} ${endAmpm}`;
      }
    }

    // Format event date string for email template
    const eventDateStr = event.eventDate
      ? event.eventDate instanceof Date
        ? event.eventDate.toISOString().split("T")[0]
        : String(event.eventDate)
      : null;

    // Send emails to all guests
    let sentCount = 0;
    const errors: { guest: string; error: string }[] = [];

    for (const invite of invites) {
      const rsvpUrl = `${appUrl}/events/rsvp?code=${invite.guest.inviteCode}&event=${eventId}`;

      try {
        let result: { error: Error | null };

        if (templateId) {
          // Use Resend template with variables
          result = await sendEmail({
            from: "Helen & Enrique <rsvp@helen-and-enrique.com>",
            to: invite.guest.email as string,
            subject: customSubject || `You're Invited to the ${event.name}!`,
            template: {
              id: templateId,
              variables: {
                FIRST_NAME: invite.guest.firstName,
                LAST_NAME: invite.guest.lastName || "",
                INVITE_CODE: invite.guest.inviteCode ?? "",
                EVENT_NAME: event.name,
                EVENT_DESCRIPTION: event.description || "",
                EVENT_DATE: eventDateStr || "",
                EVENT_TIME: eventTime || "",
                LOCATION_NAME: event.locationName || "",
                LOCATION_ADDRESS: event.locationAddress || "",
                RSVP_URL: rsvpUrl,
                APP_URL: appUrl,
              },
            },
          });
        } else {
          // Use hardcoded template
          const emailHtml = getEventInvitationEmail({
            firstName: invite.guest.firstName,
            lastName: invite.guest.lastName,
            inviteCode: invite.guest.inviteCode ?? "",
            eventName: event.name,
            eventDescription: event.description,
            eventDate: eventDateStr,
            eventTime,
            locationName: event.locationName,
            locationAddress: event.locationAddress,
            rsvpUrl,
            appUrl,
          });

          result = await sendEmail({
            from: "Helen & Enrique <rsvp@helen-and-enrique.com>",
            to: invite.guest.email as string,
            subject: `You're Invited to the ${event.name}!`,
            html: emailHtml,
          });
        }

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
