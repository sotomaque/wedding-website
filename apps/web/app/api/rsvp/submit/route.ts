import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { RSVP_NOTIFICATION_TEMPLATE_ALIAS } from "@/lib/email/constants";
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

    // Kysely query - update all guests with this invite code
    await db
      .updateTable("guests")
      .set({
        rsvp_status: attending ? "yes" : "no",
        dietary_restrictions: dietaryRestrictions || null,
      })
      .where("invite_code", "=", normalizedCode)
      .execute();

    // Send notification email to admin
    if (getResendClient() && env.RSVP_EMAIL) {
      try {
        // Fetch guests for the notification email
        const guests = await db
          .selectFrom("guests")
          .select(["first_name", "last_name", "email"])
          .where("invite_code", "=", normalizedCode)
          .execute();

        const guestNames = guests
          .map((g) => `${g.first_name}${g.last_name ? ` ${g.last_name}` : ""}`)
          .join(", ");

        const guestEmails = guests
          .filter((g) => g.email)
          .map((g) => g.email)
          .join(", ");

        const recipients = env.RSVP_EMAIL.split(",").map((e) => e.trim());
        await sendEmail({
          from: "Wedding RSVP <rsvp@helen-and-enrique.com>",
          to: recipients,
          subject: `${attending ? "✅" : "❌"} RSVP: ${guests.map((g) => g.first_name).join(", ")} - ${attending ? "Attending" : "Not Attending"}`,
          template: {
            id: RSVP_NOTIFICATION_TEMPLATE_ALIAS,
            variables: {
              GUEST_NAMES: guestNames,
              GUEST_EMAILS: guestEmails || "No email provided",
              INVITE_CODE: normalizedCode,
              STATUS_TEXT: attending ? "Attending" : "Not Attending",
              STATUS_EMOJI: attending ? "✅" : "❌",
              DIETARY_RESTRICTIONS: dietaryRestrictions || "None",
              GUEST_COUNT_TEXT:
                guests.length > 1 ? `${guests.length} guests` : "1 guest",
              CONFIRMATION_TEXT: attending ? "confirmed" : "declined",
              SUBMITTED_AT: new Date().toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: "America/Los_Angeles",
              }),
            },
          },
        });
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
