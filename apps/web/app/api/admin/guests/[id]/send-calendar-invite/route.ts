import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { generateIcs } from "@/lib/calendar/generate-ics";
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

    const guest = await db
      .selectFrom("guests")
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
    }));

    const icsContent = generateIcs(eventsForIcs, guestName);

    const eventLines = defaultEvents
      .map((e) => {
        const dateStr = e.event_date
          ? new Date(`${e.event_date}T00:00:00`).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "";
        const timeStr = e.start_time
          ? ` at ${e.start_time}${e.end_time ? ` – ${e.end_time}` : ""}`
          : "";
        const locationStr = e.location_name
          ? `<br/><small>${e.location_name}${e.location_address ? `, ${e.location_address}` : ""}</small>`
          : "";
        return `<li><strong>${e.name}</strong> — ${dateStr}${timeStr}${locationStr}</li>`;
      })
      .join("");

    const html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2d2d2d;">
        <h2 style="font-weight: normal; color: #7c6a5e;">Your Calendar Invite 💕</h2>
        <p>Hi ${guest.first_name},</p>
        <p>We're so excited to celebrate with you! Please find attached a calendar invite for our wedding events.</p>
        <ul style="line-height: 2;">${eventLines}</ul>
        <p>Open the attached <strong>.ics file</strong> to add these events to your calendar.</p>
        <p>With love,<br/>Helen &amp; Enrique</p>
      </div>
    `.trim();

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

    await db
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
