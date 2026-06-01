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

    // Fetch guest details (scoped to wedding)
    const guest = await db.guest.findFirst({
      where: { id: guestId, weddingId },
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

    // Fetch wedding date and venue from the Wedding Ceremony event
    let weddingDate = "";
    let venueName = "";
    let venueAddress = "";
    try {
      const ceremonyEvent = await db.event.findFirst({
        where: { name: "Wedding Ceremony", weddingId },
        select: { eventDate: true, locationName: true, locationAddress: true },
      });

      venueName = ceremonyEvent?.locationName ?? "";
      venueAddress = ceremonyEvent?.locationAddress ?? "";

      if (ceremonyEvent?.eventDate) {
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

    // Render DB-based template and send email
    try {
      const rendered = await renderEmailTemplate(
        weddingId,
        "wedding_invitation",
        {
          COUPLE_NAMES: settings.coupleName,
          GUEST_NAME: `${guest.firstName} ${guest.lastName || ""}`.trim(),
          INVITE_CODE: guest.inviteCode ?? "",
          RSVP_URL: rsvpUrl,
          WEDDING_DATE: weddingDate,
          VENUE_NAME: venueName,
          VENUE_ADDRESS: venueAddress,
          PERSONAL_MESSAGE: "",
        },
        guest.preferredLanguage ?? settings.defaultLanguage,
      );

      if (!rendered) {
        return NextResponse.json(
          { error: "Wedding invitation template is inactive or not found" },
          { status: 400 },
        );
      }

      const result = await sendEmail({
        from: getEmailFromAddress(settings, "Wedding Invitation"),
        to: recipientEmail,
        subject: rendered.subject,
        html: rendered.html,
        log: { weddingId, guestId, type: "wedding_invitation" },
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
