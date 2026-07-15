import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import {
  type ReminderScope,
  resolveReminderAudience,
} from "@/lib/db/admin/reminder-audience";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import {
  renderTwoWeekReminderEmail,
  type TwoWeekReminderData,
} from "@/lib/email/two-week-reminder";
import { weddingUrl } from "@/lib/url";
import {
  formatEventDateRange,
  formatEventTime,
} from "@/lib/utils/event-format";

const bodySchema = z.object({
  // "preview" sends only to the wedding's notification (admin) email so the
  // couple can review it; "send" emails the confirmed-guest audience.
  mode: z.enum(["preview", "send"]),
  // Audience scope for "send": omit/null = all confirmed guests; an event id =
  // guests confirmed for that event. An unknown id resolves to 404. Ignored for
  // "preview".
  eventId: z.string().min(1).nullish(),
  // Optional manual subset of the resolved audience. When present, only guests
  // whose id is in this list AND still in the confirmed audience are emailed —
  // the intersection is the safety net, so no strict id format is required.
  guestIds: z.array(z.string().min(1)).optional(),
});

/** Build the audience scope from an optional event id. */
function scopeFromEventId(eventId: string | null | undefined): ReminderScope {
  return eventId ? { type: "event", eventId } : { type: "all" };
}

/**
 * List the two-week reminder audience (for the manual guest picker)
 * @description Return the confirmed guests (with email) who would receive the reminder for a given audience scope (admin only)
 * @response 200:ReminderAudienceResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function GET(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const eventId = request.nextUrl.searchParams.get("eventId");
    const audience = await resolveReminderAudience(
      weddingId,
      scopeFromEventId(eventId),
    );
    if (audience === null) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      count: audience.length,
      guests: audience.map((g) => ({
        id: g.id,
        name: `${g.firstName} ${g.lastName ?? ""}`.trim(),
        email: g.email,
      })),
    });
  } catch (error) {
    console.error(
      "Error in GET /api/admin/guests/send-two-week-reminder:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Send the two-week reminder email
 * @description Email all confirmed guests a two-week reminder with the schedule and registry link, or send a preview to the wedding admin (admin only)
 * @body TwoWeekReminderBody
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

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body: mode must be "preview" or "send"' },
        { status: 400 },
      );
    }
    const { mode, eventId, guestIds } = parsed.data;

    const settings = await getWeddingSettings();
    const notificationRecipients = getNotificationRecipients(settings);

    if (!getResendClient()) {
      return NextResponse.json(
        { error: "Email is not configured" },
        { status: 500 },
      );
    }

    // Public schedule events, in display order.
    const events = await db.event.findMany({
      where: { weddingId, isPublic: true },
      orderBy: { displayOrder: "asc" },
      select: {
        name: true,
        eventDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        locationName: true,
        locationAddress: true,
      },
    });

    const weddingDateLabel = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(settings.weddingDate);

    const baseData: Omit<TwoWeekReminderData, "greetingName"> = {
      coupleName: settings.coupleName,
      weddingDateLabel,
      events: events.map((e) => ({
        name: e.name,
        dateLabel: formatEventDateRange(e.eventDate, e.endDate),
        timeLabel: formatEventTime(e.startTime, e.endTime),
        locationName: e.locationName,
        locationAddress: e.locationAddress,
      })),
      websiteUrl: weddingUrl(settings.slug),
      registryUrl: weddingUrl(settings.slug, "/registry"),
      externalRegistryUrl: settings.registryWishlistUrl,
    };

    const fromAddress = getEmailFromAddress(settings, settings.coupleName);

    // --- Preview: send a single copy to the admin notification email(s) ---
    if (mode === "preview") {
      if (notificationRecipients.length === 0) {
        return NextResponse.json(
          {
            error:
              "No admin notification email is configured. Add one in Settings → Notifications first.",
          },
          { status: 400 },
        );
      }

      const rendered = renderTwoWeekReminderEmail({
        ...baseData,
        greetingName: null,
      });

      const result = await sendEmail({
        from: fromAddress,
        to: notificationRecipients,
        subject: `[Preview] ${rendered.subject}`,
        html: rendered.html,
        log: { weddingId, type: "two_week_reminder_preview" },
      });

      if (result.error) {
        console.error("Error sending reminder preview:", result.error);
        return NextResponse.json(
          { error: "Failed to send preview email" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        mode: "preview",
        sentTo: notificationRecipients,
      });
    }

    // --- Send: email the confirmed-guest audience for the chosen scope ---
    const audience = await resolveReminderAudience(
      weddingId,
      scopeFromEventId(eventId),
    );
    if (audience === null) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // A manual selection narrows the audience; ids outside it are ignored so we
    // can never email a guest who isn't in the confirmed audience.
    const selected = guestIds ? new Set(guestIds) : null;
    const guests = selected
      ? audience.filter((g) => selected.has(g.id))
      : audience;

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const guest of guests) {
      if (!guest.email || !guest.email.includes("@")) {
        skipped++;
        continue;
      }

      const rendered = renderTwoWeekReminderEmail({
        ...baseData,
        greetingName: guest.firstName,
      });

      try {
        const result = await sendEmail({
          from: fromAddress,
          to: guest.email,
          subject: rendered.subject,
          html: rendered.html,
          log: { weddingId, guestId: guest.id, type: "two_week_reminder" },
        });
        if (result.error) {
          failed++;
        } else {
          sent++;
        }
      } catch (sendError) {
        console.error(
          `Error sending reminder to guest ${guest.id}:`,
          sendError,
        );
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      mode: "send",
      sent,
      failed,
      skipped,
      total: guests.length,
    });
  } catch (error) {
    console.error(
      "Error in POST /api/admin/guests/send-two-week-reminder:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
