import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";
import { WEDDING_INVITATION_TEMPLATE_ALIAS } from "@/lib/email/constants";

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
    const { guestId, email: emailOverride } = body;

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
    if (!env.RESEND_API_KEY || !env.RSVP_EMAIL) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const rsvpUrl = `${appUrl}/rsvp?code=${guest.invite_code}`;

    // Fetch wedding date from the Wedding Ceremony event
    let weddingDate = "";
    try {
      const ceremonyEvent = await db
        .selectFrom("events")
        .select(["event_date"])
        .where("name", "=", "Wedding Ceremony")
        .executeTakeFirst();

      if (ceremonyEvent?.event_date) {
        // event_date can be a Date object or string depending on the driver
        const dateValue = ceremonyEvent.event_date;
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
      await resend.emails.send({
        from: "Wedding Invitation <rsvp@helen-and-enrique.com>",
        to: recipientEmail,
        subject: "You're Invited to Our Wedding! 💕",
        template: {
          id: WEDDING_INVITATION_TEMPLATE_ALIAS,
          variables: {
            FIRST_NAME: guest.first_name || "",
            LAST_NAME: guest.last_name || "",
            INVITE_CODE: guest.invite_code,
            RSVP_URL: rsvpUrl,
            APP_URL: appUrl,
            WEDDING_DATE: weddingDate,
          },
        },
      });

      // Increment number_of_resends
      await db
        .updateTable("guests")
        .set({
          number_of_resends: (guest.number_of_resends || 0) + 1,
        })
        .where("id", "=", guestId)
        .execute();

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
