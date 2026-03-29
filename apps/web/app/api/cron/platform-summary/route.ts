export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend-client";

/**
 * Cron job: Send weekly platform summary to admin emails.
 *
 * Gathers platform-wide stats (weddings, guests, RSVPs, gift revenue)
 * and emails a summary to ADMIN_EMAILS.
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

    const adminEmails =
      env.ADMIN_EMAILS?.split(",")
        .map((e) => e.trim())
        .filter(Boolean) ?? [];

    if (adminEmails.length === 0) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "No ADMIN_EMAILS configured",
      });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total weddings & new this week
    const [totalWeddings, newWeddingsThisWeek] = await Promise.all([
      db.wedding.count(),
      db.wedding.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    ]);

    // Total guests & RSVPs
    const [totalGuests, totalRsvps] = await Promise.all([
      db.guest.count(),
      db.guest.count({
        where: { rsvpStatus: { in: ["yes", "no"] } },
      }),
    ]);

    // Total gift revenue
    const giftAgg = await db.gift.aggregate({
      _sum: { amountCents: true },
    });
    const totalRevenue = giftAgg._sum?.amountCents ?? 0;
    const formattedRevenue = `$${(totalRevenue / 100).toFixed(2)}`;

    // Weddings created this week
    const recentWeddings = await db.wedding.findMany({
      where: { createdAt: { gte: oneWeekAgo } },
      select: {
        coupleName: true,
        slug: true,
        weddingDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const recentWeddingsHtml =
      recentWeddings.length === 0
        ? '<p style="color: #718096; font-size: 14px;">No new weddings this week.</p>'
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 8px 12px; border-bottom: 2px solid #e2e8f0; color: #4a5568; font-size: 12px; font-weight: 600; text-transform: uppercase;">Couple</td>
              <td style="padding: 8px 12px; border-bottom: 2px solid #e2e8f0; color: #4a5568; font-size: 12px; font-weight: 600; text-transform: uppercase;">Slug</td>
              <td style="padding: 8px 12px; border-bottom: 2px solid #e2e8f0; color: #4a5568; font-size: 12px; font-weight: 600; text-transform: uppercase;">Wedding Date</td>
            </tr>
            ${recentWeddings
              .map(
                (w) => `<tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px;">${w.coupleName}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #718096; font-size: 14px;"><code>${w.slug}</code></td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #718096; font-size: 14px;">${w.weddingDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
            </tr>`,
              )
              .join("")}
          </table>`;

    const appUrl = env.NEXT_PUBLIC_APP_URL || "https://theceremony.app";
    const reportDate = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platform Weekly Summary</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300; letter-spacing: 1px;">Platform Weekly Summary</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">${reportDate}</p>
          </td>
        </tr>
      </table>

      <!-- Stats -->
      <div style="padding: 30px 40px;">
        <h2 style="margin: 0 0 20px; color: #2d3748; font-size: 20px;">Overview</h2>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 16px; background-color: #f7fafc; border-radius: 8px; text-align: center; width: 50%;">
              <p style="margin: 0; color: #667eea; font-size: 32px; font-weight: 700;">${totalWeddings}</p>
              <p style="margin: 4px 0 0; color: #718096; font-size: 13px;">Total Weddings</p>
            </td>
            <td style="width: 12px;"></td>
            <td style="padding: 16px; background-color: #f7fafc; border-radius: 8px; text-align: center; width: 50%;">
              <p style="margin: 0; color: #48bb78; font-size: 32px; font-weight: 700;">+${newWeddingsThisWeek}</p>
              <p style="margin: 4px 0 0; color: #718096; font-size: 13px;">New This Week</p>
            </td>
          </tr>
        </table>

        <div style="height: 12px;"></div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 16px; background-color: #f7fafc; border-radius: 8px; text-align: center; width: 33%;">
              <p style="margin: 0; color: #2d3748; font-size: 24px; font-weight: 700;">${totalGuests}</p>
              <p style="margin: 4px 0 0; color: #718096; font-size: 13px;">Total Guests</p>
            </td>
            <td style="width: 8px;"></td>
            <td style="padding: 16px; background-color: #f7fafc; border-radius: 8px; text-align: center; width: 33%;">
              <p style="margin: 0; color: #2d3748; font-size: 24px; font-weight: 700;">${totalRsvps}</p>
              <p style="margin: 4px 0 0; color: #718096; font-size: 13px;">Total RSVPs</p>
            </td>
            <td style="width: 8px;"></td>
            <td style="padding: 16px; background-color: #f7fafc; border-radius: 8px; text-align: center; width: 33%;">
              <p style="margin: 0; color: #2d3748; font-size: 24px; font-weight: 700;">${formattedRevenue}</p>
              <p style="margin: 4px 0 0; color: #718096; font-size: 13px;">Total Gifts</p>
            </td>
          </tr>
        </table>

        <h2 style="margin: 30px 0 16px; color: #2d3748; font-size: 20px;">Weddings Created This Week</h2>
        ${recentWeddingsHtml}

        <!-- CTA -->
        <div style="text-align: center; margin: 30px 0 10px;">
          <a href="${appUrl}/platform-admin" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 12px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 50px;">
            View Platform Admin
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 40px; background-color: #f7fafc; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          The Ceremony — Platform Weekly Summary
        </p>
      </div>
    </div>
  </body>
</html>`;

    await sendEmail({
      from: "The Ceremony <noreply@theceremony.app>",
      to: adminEmails,
      subject: `Platform Summary: ${reportDate}`,
      html,
    });

    return NextResponse.json({ success: true, sent: true });
  } catch (error) {
    console.error("Error in GET /api/cron/platform-summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
