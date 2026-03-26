import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { weddingUrl } from "@/lib/url";

/**
 * Send activities email
 * @description Send an activities/things-to-do invitation email to a guest who has RSVP'd yes
 * @body SendActivitiesEmailBody
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
    const { guestId, email: emailOverride } = body;

    if (!guestId) {
      return NextResponse.json(
        { error: "Guest ID is required" },
        { status: 400 },
      );
    }

    // Fetch guest details (scoped to wedding)
    const guest = await db.guest.findFirst({
      where: { id: guestId, weddingId },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Verify guest has RSVP'd yes
    if (guest.rsvpStatus !== "yes") {
      return NextResponse.json(
        { error: "Guest has not RSVP'd yes" },
        { status: 400 },
      );
    }

    // Determine the email to send to
    const recipientEmail = emailOverride || guest.email;

    if (
      !recipientEmail ||
      typeof recipientEmail !== "string" ||
      !recipientEmail.includes("@")
    ) {
      return NextResponse.json(
        { error: "No valid email address provided" },
        { status: 400 },
      );
    }

    // Check if email is configured
    const settings = await getWeddingSettings();
    const notificationRecipients = getNotificationRecipients(settings);
    if (!getResendClient() || notificationRecipients.length === 0) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    const appUrl = weddingUrl(settings.slug);
    const thingsToDoUrl = `${weddingUrl(settings.slug, "/things-to-do")}?code=${guest.inviteCode}`;

    try {
      const rendered = await renderEmailTemplate(
        weddingId,
        "activities_invitation",
        {
          FIRST_NAME: guest.firstName,
          LAST_NAME: guest.lastName || "",
          INVITE_CODE: guest.inviteCode ?? "",
          THINGS_TO_DO_URL: thingsToDoUrl,
          APP_URL: appUrl,
        },
        guest.preferredLanguage ?? settings.defaultLanguage,
      );

      if (!rendered) {
        return NextResponse.json(
          { error: "Activities invitation template is inactive or not found" },
          { status: 400 },
        );
      }

      const result = await sendEmail({
        from: getEmailFromAddress(settings),
        to: recipientEmail,
        subject: rendered.subject,
        html: rendered.html,
      });

      if (result.error) {
        console.error("Error sending activities email:", result.error);
        return NextResponse.json(
          { error: "Failed to send activities email" },
          { status: 500 },
        );
      }

      // Update activities email tracking
      await db.guest.update({
        where: { id: guestId },
        data: {
          activitiesEmailSent: true,
          activitiesEmailSentAt: new Date().toISOString(),
          activitiesEmailResendCount:
            (guest.activitiesEmailResendCount || 0) + 1,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Activities email sent successfully",
        email: recipientEmail,
      });
    } catch (emailError) {
      console.error("Error sending activities email:", emailError);
      return NextResponse.json(
        { error: "Failed to send activities email" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(
      "Error in POST /api/admin/guests/send-activities-email:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
