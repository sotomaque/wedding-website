import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { resolveReminderAudience } from "@/lib/db/admin/reminder-audience";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { renderThankYouPhotosEmail } from "@/lib/email/thank-you-photos";
import { weddingUrl } from "@/lib/url";

const bodySchema = z.object({
  // "preview" sends only to the wedding's notification (admin) email so the
  // couple can review it; "send" emails every confirmed guest.
  mode: z.enum(["preview", "send"]),
});

/**
 * Send the post-wedding thank-you + photo-request email
 * @description Email all confirmed guests a thank-you note with a link to upload the photos they took, or send a preview to the wedding admin (admin only)
 * @body ThankYouPhotosBody
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
    const { mode } = parsed.data;

    const settings = await getWeddingSettings();

    if (!getResendClient()) {
      return NextResponse.json(
        { error: "Email is not configured" },
        { status: 500 },
      );
    }

    const baseData = {
      coupleName: settings.coupleName,
      uploadUrl: weddingUrl(settings.slug, "/photos/upload"),
      websiteUrl: weddingUrl(settings.slug),
    };
    const fromAddress = getEmailFromAddress(settings, settings.coupleName);

    // --- Preview: send a single copy to the admin notification email(s) ---
    if (mode === "preview") {
      const notificationRecipients = getNotificationRecipients(settings);
      if (notificationRecipients.length === 0) {
        return NextResponse.json(
          {
            error:
              "No admin notification email is configured. Add one in Settings → Notifications first.",
          },
          { status: 400 },
        );
      }

      const rendered = renderThankYouPhotosEmail({
        ...baseData,
        greetingName: null,
      });

      const result = await sendEmail({
        from: fromAddress,
        to: notificationRecipients,
        subject: `[Preview] ${rendered.subject}`,
        html: rendered.html,
        log: { weddingId, type: "thank_you_photos_preview" },
      });

      if (result.error) {
        console.error("Error sending thank-you preview:", result.error);
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

    // --- Send: email every confirmed guest that has an email address ---
    const audience = await resolveReminderAudience(weddingId, { type: "all" });
    if (audience === null) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    let sent = 0;
    let failed = 0;

    for (const guest of audience) {
      const rendered = renderThankYouPhotosEmail({
        ...baseData,
        greetingName: guest.firstName,
      });

      try {
        const result = await sendEmail({
          from: fromAddress,
          to: guest.email,
          subject: rendered.subject,
          html: rendered.html,
          log: { weddingId, guestId: guest.id, type: "thank_you_photos" },
        });
        if (result.error) {
          failed++;
        } else {
          sent++;
        }
      } catch (sendError) {
        console.error(
          `Error sending thank-you to guest ${guest.id}:`,
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
      total: audience.length,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/guests/send-thank-you:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
