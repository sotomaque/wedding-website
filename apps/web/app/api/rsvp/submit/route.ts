import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";

/**
 * Submit RSVP
 * @description Submit an RSVP response for a guest party. Updates all guests with the given invite code
 * @body RsvpSubmitBody
 * @response 200:RsvpSubmitResponse
 * @tag RSVP
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, attending, dietaryRestrictions } = body;

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 },
      );
    }

    const normalizedCode = inviteCode.toUpperCase();
    const weddingId = await getWeddingId();

    // Update all guests with this invite code
    await db.guest.updateMany({
      where: { inviteCode: normalizedCode, weddingId },
      data: {
        rsvpStatus: attending ? "yes" : "no",
        dietaryRestrictions: dietaryRestrictions || null,
      },
    });

    // Send notification email to admin
    const settings = await getWeddingSettings();
    const recipients = getNotificationRecipients(settings);
    if (getResendClient() && recipients.length > 0) {
      try {
        // Fetch guests for the notification email
        const guests = await db.guest.findMany({
          where: { inviteCode: normalizedCode, weddingId },
          select: { firstName: true, lastName: true, email: true },
        });

        const guestNames = guests
          .map((g) => `${g.firstName}${g.lastName ? ` ${g.lastName}` : ""}`)
          .join(", ");

        const guestEmails = guests
          .filter((g) => g.email)
          .map((g) => g.email)
          .join(", ");

        const rsvpTemplate = await renderEmailTemplate(
          weddingId,
          "rsvp_notification",
          {
            GUEST_NAMES: guestNames,
            GUEST_EMAILS: guestEmails || "No email provided",
            INVITE_CODE: normalizedCode,
            STATUS_TEXT: attending ? "Attending" : "Not Attending",
            STATUS_EMOJI: attending ? "\u2705" : "\u274C",
            DIETARY_RESTRICTIONS: dietaryRestrictions || "None",
            GUEST_COUNT_TEXT:
              guests.length > 1 ? `${String(guests.length)} guests` : "1 guest",
            CONFIRMATION_TEXT: attending ? "confirmed" : "declined",
            SUBMITTED_AT: new Date().toLocaleString("en-US", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: "America/Los_Angeles",
            }),
          },
          settings.defaultLanguage,
        );

        if (rsvpTemplate) {
          await sendEmail({
            from: getEmailFromAddress(settings, "Wedding RSVP"),
            to: recipients,
            subject: rsvpTemplate.subject,
            html: rsvpTemplate.html,
          });
        }
      } catch (emailError) {
        // Log but don't fail the RSVP submission if email fails
        console.error("Error sending RSVP notification email:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/rsvp/submit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
