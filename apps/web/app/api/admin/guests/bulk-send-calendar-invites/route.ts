import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  buildCalendarEmailHtml,
  generateIcs,
} from "@/lib/calendar/generate-ics";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getEmailFromAddress } from "@/lib/email/helpers";
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

    const guests = await db.guest.findMany({
      where: { id: { in: guestIds }, weddingId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        rsvpStatus: true,
        calendarInviteResendCount: true,
      },
    });

    // Only send to attending guests with a valid email
    const eligible = guests.filter(
      (g) => g.rsvpStatus === "yes" && g.email?.includes("@"),
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
    const defaultEvents = await db.event.findMany({
      where: { isDefault: true, weddingId },
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

    const settings = await getWeddingSettings();
    let sentCount = 0;
    const errors: Array<{ guestId: string; error: string }> = [];

    for (const guest of eligible) {
      try {
        const guestName = `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`;
        const icsContent = generateIcs(eventsForIcs, guestName);
        const html = buildCalendarEmailHtml(eventsForIcs, guest.firstName);

        const result = await sendEmail({
          from: getEmailFromAddress(settings),
          to: guest.email as string,
          subject: `Your Calendar Invite \u2014 ${settings.coupleName}'s Wedding \uD83D\uDC95`,
          html,
          attachments: [
            {
              filename: `${settings.slug}-wedding.ics`,
              content: Buffer.from(icsContent).toString("base64"),
            },
          ],
        });

        if (result.error) {
          errors.push({ guestId: guest.id, error: result.error.message });
          continue;
        }

        await db.guest.update({
          where: { id: guest.id },
          data: {
            calendarInviteSent: true,
            calendarInviteSentAt: new Date().toISOString(),
            calendarInviteResendCount:
              (guest.calendarInviteResendCount || 0) + 1,
          },
        });

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
