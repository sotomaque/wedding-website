import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getWeddingInvitationEmail } from "@/lib/email/templates/wedding-invitation";

/**
 * POST /api/admin/guests/resend-email
 * Resend invitation email to a guest (admin only)
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
    const { guestId } = body;

    if (!guestId) {
      return NextResponse.json(
        { error: "Guest ID is required" },
        { status: 400 },
      );
    }

    // Kysely query - fetch guest details
    const guest = await db
      .selectFrom("guests")
      .selectAll()
      .where("id", "=", guestId)
      .executeTakeFirst();

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Check if email is configured
    if (!env.RESEND_API_KEY || !env.RSVP_EMAIL) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const rsvpUrl = `${appUrl}/rsvp?code=${guest.invite_code}`;

    // Send email using shared template
    try {
      const emailHtml = getWeddingInvitationEmail({
        firstName: guest.first_name,
        lastName: guest.last_name,
        inviteCode: guest.invite_code,
        rsvpUrl,
        appUrl,
      });

      await resend.emails.send({
        from: "Wedding Invitation <onboarding@resend.dev>",
        to: guest.email || "",
        subject: "You're Invited to Our Wedding! 💕",
        html: emailHtml,
      });

      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
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
