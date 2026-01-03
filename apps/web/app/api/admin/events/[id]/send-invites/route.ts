import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getEventInvitationEmail } from "@/lib/email/templates/event-invitation";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/events/[id]/send-invites
 * Send invitation emails to selected guests for this event (admin only)
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
    if (!env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    // Verify event exists and is not a default event
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirst();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.is_default) {
      return NextResponse.json(
        { error: "Cannot send event invites for default events" },
        { status: 400 },
      );
    }

    // Get all invited guests that match the provided IDs
    const invites = await db
      .selectFrom("guest_event_invites")
      .innerJoin("guests", "guests.id", "guest_event_invites.guest_id")
      .select([
        "guest_event_invites.id as invite_id",
        "guest_event_invites.email_resend_count",
        "guests.id as guest_id",
        "guests.first_name",
        "guests.last_name",
        "guests.email",
        "guests.invite_code",
      ])
      .where("guest_event_invites.event_id", "=", eventId)
      .where("guests.id", "in", guestIds)
      .execute();

    if (invites.length === 0) {
      return NextResponse.json(
        { error: "No invited guests found with the provided IDs" },
        { status: 404 },
      );
    }

    // Validate all guests have emails
    const guestsWithoutEmail = invites.filter((g) => !g.email?.includes("@"));
    if (guestsWithoutEmail.length > 0) {
      return NextResponse.json(
        {
          error: `${guestsWithoutEmail.length} guest(s) don't have valid email addresses`,
          guestsWithoutEmail: guestsWithoutEmail.map((g) => g.first_name),
        },
        { status: 400 },
      );
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Format event time if available
    let eventTime: string | null = null;
    if (event.start_time) {
      const [hours, minutes] = event.start_time.split(":");
      const hour = Number.parseInt(hours || "0", 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      eventTime = `${hour12}:${minutes} ${ampm}`;
      if (event.end_time) {
        const [endHours, endMinutes] = event.end_time.split(":");
        const endHour = Number.parseInt(endHours || "0", 10);
        const endAmpm = endHour >= 12 ? "PM" : "AM";
        const endHour12 = endHour % 12 || 12;
        eventTime += ` - ${endHour12}:${endMinutes} ${endAmpm}`;
      }
    }

    // Format event date string for email template
    const eventDateStr = event.event_date
      ? event.event_date instanceof Date
        ? event.event_date.toISOString().split("T")[0]
        : String(event.event_date)
      : null;

    // Send emails to all guests
    let sentCount = 0;
    const errors: { guest: string; error: string }[] = [];

    for (const invite of invites) {
      const rsvpUrl = `${appUrl}/events/rsvp?code=${invite.invite_code}&event=${eventId}`;

      try {
        if (templateId) {
          // Use Resend template with variables
          await resend.emails.send({
            from: "Helen & Enrique <rsvp@helen-and-enrique.com>",
            to: invite.email as string,
            subject: customSubject || `You're Invited to the ${event.name}!`,
            react: undefined,
            html: undefined,
            // @ts-expect-error - Resend SDK types don't include template support yet
            template_id: templateId,
            data: {
              FIRST_NAME: invite.first_name,
              LAST_NAME: invite.last_name || "",
              INVITE_CODE: invite.invite_code,
              EVENT_NAME: event.name,
              EVENT_DESCRIPTION: event.description || "",
              EVENT_DATE: eventDateStr || "",
              EVENT_TIME: eventTime || "",
              LOCATION_NAME: event.location_name || "",
              LOCATION_ADDRESS: event.location_address || "",
              RSVP_URL: rsvpUrl,
              APP_URL: appUrl,
            },
          });
        } else {
          // Use hardcoded template
          const emailHtml = getEventInvitationEmail({
            firstName: invite.first_name,
            lastName: invite.last_name,
            inviteCode: invite.invite_code,
            eventName: event.name,
            eventDescription: event.description,
            eventDate: eventDateStr,
            eventTime,
            locationName: event.location_name,
            locationAddress: event.location_address,
            rsvpUrl,
            appUrl,
          });

          await resend.emails.send({
            from: "Helen & Enrique <rsvp@helen-and-enrique.com>",
            to: invite.email as string,
            subject: `You're Invited to the ${event.name}!`,
            html: emailHtml,
          });
        }

        // Update invite record with email sent status
        await db
          .updateTable("guest_event_invites")
          .set({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
            email_resend_count: (invite.email_resend_count || 0) + 1,
          })
          .where("id", "=", invite.invite_id)
          .execute();

        sentCount++;
      } catch (emailError) {
        console.error(`Error sending email to ${invite.email}:`, emailError);
        errors.push({
          guest: `${invite.first_name} ${invite.last_name || ""}`.trim(),
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
