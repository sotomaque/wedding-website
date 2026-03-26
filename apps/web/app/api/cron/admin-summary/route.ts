import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { sendEmail } from "@/lib/email/resend-client";
import { weddingUrl } from "@/lib/url";

/**
 * Cron job: Send admin summary emails with A-list guest status.
 *
 * Each wedding can have an AdminSummaryConfig that controls whether
 * summaries are enabled and how often they are sent (frequencyDays).
 *
 * @method GET
 * @auth CRON_SECRET bearer token
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find all enabled admin summary configs
    const configs = await db.adminSummaryConfig.findMany({
      where: { isEnabled: true },
      include: {
        wedding: {
          select: {
            id: true,
            slug: true,
            coupleName: true,
            weddingDate: true,
            emailFromName: true,
            emailFromAddress: true,
            notificationEmails: true,
          },
        },
      },
    });

    let totalSent = 0;
    const results: { weddingId: string; sent: boolean; error?: string }[] = [];

    for (const config of configs) {
      const { wedding } = config;

      // Check if enough time has passed since last run
      if (config.lastRunAt) {
        const msSinceLastRun = now.getTime() - config.lastRunAt.getTime();
        const daysSinceLastRun = msSinceLastRun / (1000 * 60 * 60 * 24);
        if (daysSinceLastRun < config.frequencyDays) {
          continue;
        }
      }

      // Get notification recipients
      const recipients = getNotificationRecipients(wedding);
      if (recipients.length === 0) {
        results.push({
          weddingId: wedding.id,
          sent: false,
          error: "No notification recipients configured",
        });
        continue;
      }

      // Gather A-list guest stats
      const aListGuests = await db.guest.findMany({
        where: {
          weddingId: wedding.id,
          list: "a",
          isPlusOne: false,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          rsvpStatus: true,
          numberOfResends: true,
        },
      });

      const totalAList = aListGuests.length;
      const invited = aListGuests.filter((g) => g.numberOfResends > 0);
      const notInvited = aListGuests.filter((g) => g.numberOfResends === 0);
      const pending = invited.filter((g) => g.rsvpStatus === "pending");
      const yes = invited.filter((g) => g.rsvpStatus === "yes");
      const no = invited.filter((g) => g.rsvpStatus === "no");

      // Build uninvited guests HTML
      let uninvitedHtml: string;
      if (notInvited.length === 0) {
        uninvitedHtml =
          '<p style="margin: 0; color: #276749; font-size: 14px;">All A-list guests have been invited!</p>';
      } else {
        const listItems = notInvited
          .map((g) => {
            const name = `${g.firstName} ${g.lastName || ""}`.trim();
            const email = g.email || "No email";
            return `<tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px;">${name}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #718096; font-size: 14px;">${email}</td>
            </tr>`;
          })
          .join("");

        uninvitedHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 2px solid #e2e8f0; color: #4a5568; font-size: 12px; font-weight: 600; text-transform: uppercase;">Name</td>
            <td style="padding: 8px 12px; border-bottom: 2px solid #e2e8f0; color: #4a5568; font-size: 12px; font-weight: 600; text-transform: uppercase;">Email</td>
          </tr>
          ${listItems}
        </table>`;
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

      const reportDate = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const adminUrl = weddingUrl(wedding.slug, "/admin/guests");

      try {
        const rendered = await renderEmailTemplate(
          wedding.id,
          "admin_summary",
          {
            COUPLE_NAMES: wedding.coupleName,
            WEDDING_DATE: formattedWeddingDate,
            TOTAL_A_LIST: String(totalAList),
            A_LIST_INVITED: String(invited.length),
            A_LIST_NOT_INVITED: String(notInvited.length),
            A_LIST_PENDING: String(pending.length),
            A_LIST_YES: String(yes.length),
            A_LIST_NO: String(no.length),
            UNINVITED_GUESTS: uninvitedHtml,
            ADMIN_URL: adminUrl,
            REPORT_DATE: reportDate,
          },
        );

        if (!rendered) {
          results.push({
            weddingId: wedding.id,
            sent: false,
            error: "Admin summary template inactive or not found",
          });
          continue;
        }

        const result = await sendEmail({
          from: getEmailFromAddress(wedding, "Wedding Summary"),
          to: recipients,
          subject: rendered.subject,
          html: rendered.html,
        });

        if (result.error) {
          throw result.error;
        }

        // Update lastRunAt
        await db.adminSummaryConfig.update({
          where: { id: config.id },
          data: { lastRunAt: now },
        });

        totalSent++;
        results.push({ weddingId: wedding.id, sent: true });
      } catch (err) {
        console.error(
          `Error sending admin summary for wedding ${wedding.id}:`,
          err,
        );
        results.push({
          weddingId: wedding.id,
          sent: false,
          error: "Failed to send email",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalSent,
      results,
    });
  } catch (error) {
    console.error("Error in GET /api/cron/admin-summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
