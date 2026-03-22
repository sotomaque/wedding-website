import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  buildCalendarEmailHtml,
  generateIcs,
} from "@/lib/calendar/generate-ics";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend-client";

/**
 * Send a calendar invite email to a specific attending guest
 * @description Sends a .ics calendar invite for all default wedding events to the guest
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: guestId } = await params;

    const guest = await db.guest.findUnique({
      where: { id: guestId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        rsvpStatus: true,
        calendarInviteResendCount: true,
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    if (guest.rsvpStatus !== "yes") {
      return NextResponse.json(
        { error: "Guest has not confirmed attendance" },
        { status: 400 },
      );
    }

    if (!guest.email || !guest.email.includes("@")) {
      return NextResponse.json(
        { error: "Guest has no valid email address" },
        { status: 400 },
      );
    }

    const defaultEvents = await db.event.findMany({
      where: { isDefault: true },
      select: {
        id: true,
        name: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        locationName: true,
        locationAddress: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    if (defaultEvents.length === 0) {
      return NextResponse.json(
        { error: "No default events found to include in invite" },
        { status: 500 },
      );
    }

    const guestName = `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`;

    const eventsForIcs = defaultEvents.map((e) => ({
      id: e.id,
      name: e.name,
      event_date:
        e.eventDate instanceof Date
          ? e.eventDate
          : e.eventDate
            ? new Date(`${e.eventDate}T00:00:00`)
            : null,
      start_time: e.startTime
        ? e.startTime instanceof Date
          ? e.startTime.toISOString()
          : String(e.startTime)
        : null,
      end_time: e.endTime
        ? e.endTime instanceof Date
          ? e.endTime.toISOString()
          : String(e.endTime)
        : null,
      location_name: e.locationName,
      location_address: e.locationAddress,
    }));

    const icsContent = generateIcs(eventsForIcs, guestName);
    const html = buildCalendarEmailHtml(eventsForIcs, guest.firstName);

    const result = await sendEmail({
      from: "Helen & Enrique <rsvp@helen-and-enrique.com>",
      to: guest.email,
      subject: "Your Calendar Invite — Helen & Enrique's Wedding 💕",
      html,
      attachments: [
        {
          filename: "helen-and-enrique-wedding.ics",
          content: Buffer.from(icsContent).toString("base64"),
        },
      ],
    });

    if (result.error) {
      console.error("Error sending calendar invite:", result.error);
      return NextResponse.json(
        { error: "Failed to send calendar invite" },
        { status: 500 },
      );
    }

    await db.guest.update({
      where: { id: guestId },
      data: {
        calendarInviteSent: true,
        calendarInviteSentAt: new Date().toISOString(),
        calendarInviteResendCount: (guest.calendarInviteResendCount || 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Calendar invite sent successfully",
      email: guest.email,
    });
  } catch (error) {
    console.error(
      "Error in POST /api/admin/guests/[id]/send-calendar-invite:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
