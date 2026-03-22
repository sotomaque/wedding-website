import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  buildCalendarEmailHtml,
  type CalendarEvent,
  generateIcs,
} from "@/lib/calendar/generate-ics";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
import { getWeddingId } from "@/lib/db/wedding-context";
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
    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);

    const guest = await db
      .selectFrom("guests")
      .where("wedding_id", "=", weddingId)
      .select([
        "id",
        "first_name",
        "last_name",
        "email",
        "rsvp_status",
        "calendar_invite_resend_count",
      ])
      .where("id", "=", guestId)
      .executeTakeFirst();

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    if (guest.rsvp_status !== "yes") {
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

    const defaultEvents = await db
      .selectFrom("events")
      .where("wedding_id", "=", weddingId)
      .select([
        "id",
        "name",
        "event_date",
        "start_time",
        "end_time",
        "location_name",
        "location_address",
      ])
      .where("is_default", "=", true)
      .orderBy("display_order", "asc")
      .execute();

    if (defaultEvents.length === 0) {
      return NextResponse.json(
        { error: "No default events found to include in invite" },
        { status: 500 },
      );
    }

    const guestName = `${guest.first_name}${guest.last_name ? ` ${guest.last_name}` : ""}`;

    const eventsForIcs = defaultEvents.map((e) => ({
      ...e,
      event_date:
        e.event_date instanceof Date
          ? e.event_date
          : e.event_date
            ? new Date(`${e.event_date}T00:00:00`)
            : null,
    })) as CalendarEvent[];

    const icsContent = generateIcs(eventsForIcs, guestName);
    const html = buildCalendarEmailHtml(eventsForIcs, guest.first_name);

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

    await weddingDb
      .updateTable("guests")
      .set({
        calendar_invite_sent: true,
        calendar_invite_sent_at: new Date().toISOString(),
        calendar_invite_resend_count:
          (guest.calendar_invite_resend_count || 0) + 1,
      })
      .where("id", "=", guestId)
      .execute();

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
