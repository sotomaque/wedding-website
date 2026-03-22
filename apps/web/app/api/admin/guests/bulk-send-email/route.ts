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
 * Bulk send invitation emails
 * @description Send wedding invitation emails to multiple guests at once using the default or a custom Resend template
 * @body BulkSendEmailBody
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
    const { guestIds, templateId, subject: customSubject } = body;

    if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json(
        { error: "Guest IDs array is required" },
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

    // Fetch all guests
    const guests = await db.guest.findMany({
      where: { id: { in: guestIds }, weddingId },
    });

    if (guests.length === 0) {
      return NextResponse.json({ error: "No guests found" }, { status: 404 });
    }

    // Validate all guests have emails and haven't RSVP'd yes
    const guestsWithoutEmail = guests.filter((g) => !g.email?.includes("@"));
    if (guestsWithoutEmail.length > 0) {
      return NextResponse.json(
        {
          error: `${guestsWithoutEmail.length} guest(s) don't have valid email addresses`,
          guestsWithoutEmail: guestsWithoutEmail.map((g) => g.firstName),
        },
        { status: 400 },
      );
    }

    const guestsAlreadyRsvpd = guests.filter((g) => g.rsvpStatus === "yes");
    if (guestsAlreadyRsvpd.length > 0) {
      return NextResponse.json(
        {
          error: `${guestsAlreadyRsvpd.length} guest(s) have already RSVP'd yes`,
          guestsAlreadyRsvpd: guestsAlreadyRsvpd.map((g) => g.firstName),
        },
        { status: 400 },
      );
    }

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

    // Send emails to all guests
    let sentCount = 0;
    const errors: { guest: string; error: string }[] = [];

    for (const guest of guests) {
      const rsvpUrl = `${weddingUrl(settings.slug, "/rsvp")}?code=${guest.inviteCode}`;

      try {
        // Use Resend template (default: wedding-invitation template)
        const templateToUse = templateId || WEDDING_INVITATION_TEMPLATE_ALIAS;

        const result = await sendEmail({
          from: getEmailFromAddress(settings, "Wedding Invitation"),
          to: guest.email as string,
          subject: customSubject || "You're Invited to Our Wedding!",
          template: {
            id: templateToUse,
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
          throw result.error;
        }

        // Increment numberOfResends
        await db.guest.update({
          where: { id: guest.id },
          data: {
            numberOfResends: (guest.numberOfResends || 0) + 1,
          },
        });

        sentCount++;
      } catch (emailError) {
        console.error(`Error sending email to ${guest.email}:`, emailError);
        errors.push({
          guest: `${guest.firstName} ${guest.lastName || ""}`.trim(),
          error: "Failed to send email",
        });
      }
    }

    if (sentCount === 0) {
      return NextResponse.json(
        { error: "Failed to send any emails", errors },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalRequested: guests.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/guests/bulk-send-email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
