import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getRsvpNotificationEmail } from "@/lib/email/templates/rsvp-notification";

/**
 * POST /api/rsvp/submit
 * Submit RSVP response
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
    if (env.RESEND_API_KEY && env.RSVP_EMAIL) {
      try {
        // Fetch guests for the notification email
        const guests = await db
          .selectFrom("guests")
          .select(["first_name", "last_name", "email"])
          .where("invite_code", "=", normalizedCode)
          .execute();

        const resend = new Resend(env.RESEND_API_KEY);
        const emailHtml = getRsvpNotificationEmail({
          guests: guests.map((g) => ({
            firstName: g.first_name,
            lastName: g.last_name,
            email: g.email,
          })),
          inviteCode: normalizedCode,
          attending,
          dietaryRestrictions,
          submittedAt: new Date().toLocaleString("en-US", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "America/Los_Angeles",
          }),
        });

        await resend.emails.send({
          from: "Wedding RSVP <onboarding@resend.dev>",
          to: env.RSVP_EMAIL,
          subject: `${attending ? "✅" : "❌"} RSVP: ${guests.map((g) => g.first_name).join(", ")} - ${attending ? "Attending" : "Not Attending"}`,
          html: emailHtml,
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
