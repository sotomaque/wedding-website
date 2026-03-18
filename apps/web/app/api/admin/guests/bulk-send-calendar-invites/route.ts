import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { generateIcs } from "@/lib/calendar/generate-ics";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend-client";

/**
 * Bulk send calendar invite emails to attending guests
 * @description Send .ics calendar invites for all default wedding events to a list of attending guests
 * @body BulkSendCalendarInvitesBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { guestIds } = body;

    if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json(
        { error: "Guest IDs array is required" },
        { status: 400 },
      );
    }

    const guests = await db
      .selectFrom("guests")
      .select([
        "id",
        "first_name",
        "last_name",
        "email",
        "rsvp_status",
        "calendar_invite_resend_count",
      ])
      .where("id", "in", guestIds)
      .execute();

    // Only send to attending guests with a valid email
    const eligible = guests.filter(
      (g) => g.rsvp_status === "yes" && g.email?.includes("@"),
    );

    if (eligible.length === 0) {
      return NextResponse.json(
        {
          error:
            "None of the selected guests are attending or have valid email addresses",
        },
        { status: 400 },
      );
    }

    // Fetch default events once — shared across all guests
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

    const eventsForIcs = defaultEvents.map((e) => ({
      ...e,
      event_date:
        e.event_date instanceof Date
          ? e.event_date
          : e.event_date
            ? new Date(`${e.event_date}T00:00:00`)
            : null,
    }));

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

    let sentCount = 0;
    const errors: Array<{ guestId: string; error: string }> = [];

    for (const guest of eligible) {
      try {
        const guestName = `${guest.first_name}${guest.last_name ? ` ${guest.last_name}` : ""}`;
        const icsContent = generateIcs(eventsForIcs, guestName);

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
          to: guest.email as string,
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
          errors.push({ guestId: guest.id, error: result.error.message });
          continue;
        }

        await db
          .updateTable("guests")
          .set({
            calendar_invite_sent: true,
            calendar_invite_sent_at: new Date().toISOString(),
            calendar_invite_resend_count:
              (guest.calendar_invite_resend_count || 0) + 1,
          })
          .where("id", "=", guest.id)
          .execute();

        sentCount++;
      } catch (guestError) {
        console.error(
          `Error sending calendar invite to guest ${guest.id}:`,
          guestError,
        );
        errors.push({
          guestId: guest.id,
          error:
            guestError instanceof Error ? guestError.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalRequested: guestIds.length,
      eligible: eligible.length,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    console.error(
      "Error in POST /api/admin/guests/bulk-send-calendar-invites:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
