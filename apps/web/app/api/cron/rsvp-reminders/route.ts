export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getEmailFromAddress } from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { sendEmail } from "@/lib/email/resend-client";
import { weddingUrl } from "@/lib/url";

/**
 * Cron job: Send RSVP reminder emails to guests who have been invited
 * but haven't responded, based on configurable reminder schedules.
 *
 * Each wedding can have multiple ReminderSchedule records (e.g. 10 days
 * before deadline, 3 days before deadline). This endpoint checks all
 * weddings and sends reminders when the current date matches a schedule.
 *
 * @method GET
 * @auth CRON_SECRET bearer token
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find all enabled reminder schedules across all weddings
    const schedules = await db.reminderSchedule.findMany({
      where: { isEnabled: true },
      include: {
        wedding: {
          select: {
            id: true,
            slug: true,
            coupleName: true,
            weddingDate: true,
            rsvpDeadline: true,
            emailFromName: true,
            emailFromAddress: true,
            defaultLanguage: true,
          },
        },
      },
    });

    let totalSent = 0;
    const results: { weddingId: string; sent: number; errors: number }[] = [];

    for (const schedule of schedules) {
      const { wedding } = schedule;

      // Parse RSVP deadline
      const rsvpDeadline = wedding.rsvpDeadline
        ? new Date(wedding.rsvpDeadline)
        : wedding.weddingDate;

      if (!rsvpDeadline || Number.isNaN(rsvpDeadline.getTime())) {
        continue;
      }

      // Calculate the target date for this reminder
      const targetDate = new Date(rsvpDeadline);
      targetDate.setDate(targetDate.getDate() - schedule.daysBeforeDeadline);
      const targetDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
      );

      // Only send if today matches the target date
      if (today.getTime() !== targetDay.getTime()) {
        continue;
      }

      // Check if already run today
      if (schedule.lastRunAt) {
        const lastRun = new Date(schedule.lastRunAt);
        const lastRunDay = new Date(
          lastRun.getFullYear(),
          lastRun.getMonth(),
          lastRun.getDate(),
        );
        if (lastRunDay.getTime() === today.getTime()) {
          continue;
        }
      }

      // Calculate days remaining
      const daysRemaining = Math.ceil(
        (rsvpDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysRemaining < 0) {
        continue; // Past deadline
      }

      // Find guests who were invited (numberOfResends > 0) but haven't RSVP'd
      const guests = await db.guest.findMany({
        where: {
          weddingId: wedding.id,
          numberOfResends: { gt: 0 },
          rsvpStatus: "pending",
          email: { not: null },
          isPlusOne: false,
        },
      });

      if (guests.length === 0) {
        continue;
      }

      const formattedWeddingDate = wedding.weddingDate.toLocaleDateString(
        "en-US",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );

      const formattedDeadline = rsvpDeadline.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      let sent = 0;
      let errors = 0;

      for (const guest of guests) {
        const inviteCode = guest.inviteCode ?? "";
        const rsvpUrl = `${weddingUrl(wedding.slug, "/rsvp")}?code=${inviteCode}`;

        try {
          const rendered = await renderEmailTemplate(
            wedding.id,
            "rsvp_reminder",
            {
              GUEST_NAME: `${guest.firstName} ${guest.lastName || ""}`.trim(),
              COUPLE_NAMES: wedding.coupleName,
              WEDDING_DATE: formattedWeddingDate,
              RSVP_DEADLINE: formattedDeadline,
              DAYS_REMAINING: String(daysRemaining),
              RSVP_URL: rsvpUrl,
              INVITE_CODE: inviteCode,
            },
            guest.preferredLanguage ?? wedding.defaultLanguage,
          );

          if (!rendered) {
            continue; // Template inactive
          }

          const result = await sendEmail({
            from: getEmailFromAddress(wedding, "RSVP Reminder"),
            to: guest.email as string,
            subject: rendered.subject,
            html: rendered.html,
            log: {
              weddingId: wedding.id,
              guestId: guest.id,
              type: "rsvp_reminder",
            },
          });

          if (result.error) {
            throw result.error;
          }

          // Update guest reminder tracking
          await db.guest.update({
            where: { id: guest.id },
            data: {
              lastReminderSentAt: now,
              reminderCount: (guest.reminderCount ?? 0) + 1,
            },
          });

          sent++;
        } catch (err) {
          console.error(`Error sending RSVP reminder to ${guest.email}:`, err);
          errors++;
        }
      }

      // Update schedule lastRunAt
      await db.reminderSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now },
      });

      totalSent += sent;
      results.push({ weddingId: wedding.id, sent, errors });
    }

    return NextResponse.json({
      success: true,
      totalSent,
      results,
    });
  } catch (error) {
    console.error("Error in GET /api/cron/rsvp-reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
