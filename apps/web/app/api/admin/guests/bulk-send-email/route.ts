import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getWeddingInvitationEmail } from "@/lib/email/templates/wedding-invitation";

/**
 * POST /api/admin/guests/bulk-send-email
 * Send invitation emails to multiple guests (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { guestIds } = body;

    if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json(
        { error: "Guest IDs array is required" },
        { status: 400 },
      );
    }

    // Check if email is configured
    if (!env.RESEND_API_KEY || !env.RSVP_EMAIL) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    // Fetch all guests
    const guests = await db
      .selectFrom("guests")
      .selectAll()
      .where("id", "in", guestIds)
      .execute();

    if (guests.length === 0) {
      return NextResponse.json({ error: "No guests found" }, { status: 404 });
    }

    // Validate all guests have emails and haven't RSVP'd yes
    const guestsWithoutEmail = guests.filter((g) => !g.email?.includes("@"));
    if (guestsWithoutEmail.length > 0) {
      return NextResponse.json(
        {
          error: `${guestsWithoutEmail.length} guest(s) don't have valid email addresses`,
          guestsWithoutEmail: guestsWithoutEmail.map((g) => g.first_name),
        },
        { status: 400 },
      );
    }

    const guestsAlreadyRsvpd = guests.filter((g) => g.rsvp_status === "yes");
    if (guestsAlreadyRsvpd.length > 0) {
      return NextResponse.json(
        {
          error: `${guestsAlreadyRsvpd.length} guest(s) have already RSVP'd yes`,
          guestsAlreadyRsvpd: guestsAlreadyRsvpd.map((g) => g.first_name),
        },
        { status: 400 },
      );
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Send emails to all guests
    let sentCount = 0;
    const errors: { guest: string; error: string }[] = [];

    for (const guest of guests) {
      const rsvpUrl = `${appUrl}/rsvp?code=${guest.invite_code}`;

      try {
        const emailHtml = getWeddingInvitationEmail({
          firstName: guest.first_name,
          lastName: guest.last_name,
          inviteCode: guest.invite_code,
          rsvpUrl,
          appUrl,
        });

        await resend.emails.send({
          from: "Wedding Invitation <rsvp@helen-and-enrique.com>",
          to: guest.email as string,
          subject: "You're Invited to Our Wedding! 💕",
          html: emailHtml,
        });

        // Increment number_of_resends
        await db
          .updateTable("guests")
          .set({
            number_of_resends: (guest.number_of_resends || 0) + 1,
          })
          .where("id", "=", guest.id)
          .execute();

        sentCount++;
      } catch (emailError) {
        console.error(`Error sending email to ${guest.email}:`, emailError);
        errors.push({
          guest: `${guest.first_name} ${guest.last_name || ""}`.trim(),
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
