import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { WEDDING_INVITATION_TEMPLATE_ALIAS } from "@/lib/email/constants";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { weddingUrl } from "@/lib/url";

/**
 * Resend invitation email
 * @description Resend a wedding invitation email to a specific guest, with optional email override
 * @body ResendEmailBody
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

    // Fetch guest details
    const guest = await db.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Determine the email to send to (prefer override, fallback to DB value)
    const recipientEmail = emailOverride || guest.email;

    // Validate that we have a valid email address
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

    const rsvpUrl = `${weddingUrl(settings.slug, "/rsvp")}?code=${guest.inviteCode}`;
    const appUrl = weddingUrl(settings.slug);

    // Fetch wedding date from the Wedding Ceremony event
    let weddingDate = "";
    try {
      const ceremonyEvent = await db.event.findFirst({
        where: { name: "Wedding Ceremony", weddingId },
        select: { eventDate: true },
      });

      if (ceremonyEvent?.eventDate) {
        // eventDate can be a Date object or string depending on the driver
        const dateValue = ceremonyEvent.eventDate;
        const dateObj =
          dateValue instanceof Date
            ? dateValue
            : new Date(`${dateValue}T00:00:00`);

        if (!Number.isNaN(dateObj.getTime())) {
          weddingDate = dateObj.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      }
    } catch (dateError) {
      console.error("Error fetching wedding date:", dateError);
    }

    // Send email using Resend template
    try {
      const result = await sendEmail({
        from: getEmailFromAddress(settings, "Wedding Invitation"),
        to: recipientEmail,
        subject: "You're Invited to Our Wedding! 💕",
        template: {
          id: WEDDING_INVITATION_TEMPLATE_ALIAS,
          variables: {
            FIRST_NAME: guest.firstName || "",
            LAST_NAME: guest.lastName || "",
            INVITE_CODE: guest.inviteCode ?? "",
            RSVP_URL: rsvpUrl,
            APP_URL: appUrl,
            WEDDING_DATE: weddingDate,
          },
        },
      });

      if (result.error) {
        console.error("Error sending email:", result.error);
        return NextResponse.json(
          { error: "Failed to send email" },
          { status: 500 },
        );
      }

      // Increment numberOfResends
      await db.guest.update({
        where: { id: guestId },
        data: {
          numberOfResends: (guest.numberOfResends || 0) + 1,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        email: recipientEmail,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in POST /api/admin/guests/resend-email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
