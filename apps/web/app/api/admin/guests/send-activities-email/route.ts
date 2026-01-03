import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getActivitiesInvitationEmail } from "@/lib/email/templates/activities-invitation";

/**
 * POST /api/admin/guests/send-activities-email
 * Send activities invitation email to a guest who has RSVP'd yes (admin only)
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
    const {
      guestId,
      email: emailOverride,
      templateId,
      subject: customSubject,
    } = body;

    if (!guestId) {
      return NextResponse.json(
        { error: "Guest ID is required" },
        { status: 400 },
      );
    }

    // Fetch guest details
    const guest = await db
      .selectFrom("guests")
      .selectAll()
      .where("id", "=", guestId)
      .executeTakeFirst();

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Verify guest has RSVP'd yes
    if (guest.rsvp_status !== "yes") {
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
    if (!env.RESEND_API_KEY || !env.RSVP_EMAIL) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const thingsToDoUrl = `${appUrl}/things-to-do?code=${guest.invite_code}`;

    try {
      if (templateId) {
        // Use Resend template with variables
        await resend.emails.send({
          from: "Helen & Enrique <rsvp@helen-and-enrique.com>",
          to: recipientEmail,
          subject:
            customSubject ||
            "Explore San Diego - Things to Do Before the Wedding!",
          react: undefined,
          html: undefined,
          // @ts-expect-error - Resend SDK types don't include template support yet
          template_id: templateId,
          data: {
            FIRST_NAME: guest.first_name,
            LAST_NAME: guest.last_name || "",
            INVITE_CODE: guest.invite_code,
            THINGS_TO_DO_URL: thingsToDoUrl,
            APP_URL: appUrl,
          },
        });
      } else {
        // Use hardcoded template
        const emailHtml = getActivitiesInvitationEmail({
          firstName: guest.first_name,
          lastName: guest.last_name,
          inviteCode: guest.invite_code,
          thingsToDoUrl,
          appUrl,
        });

        await resend.emails.send({
          from: "Helen & Enrique <rsvp@helen-and-enrique.com>",
          to: recipientEmail,
          subject: "Explore San Diego - Things to Do Before the Wedding! 🌴",
          html: emailHtml,
        });
      }

      // Update activities email tracking
      await db
        .updateTable("guests")
        .set({
          activities_email_sent: true,
          activities_email_sent_at: new Date().toISOString(),
          activities_email_resend_count:
            (guest.activities_email_resend_count || 0) + 1,
        })
        .where("id", "=", guestId)
        .execute();

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
