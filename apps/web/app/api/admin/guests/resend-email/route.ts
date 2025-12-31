import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";

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
    const rsvpUrl = `${env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/rsvp?code=${guest.invite_code}`;

    // Send email
    try {
      await resend.emails.send({
        from: "Wedding Invitation <onboarding@resend.dev>",
        to: guest.email || "",
        subject: "You're Invited to Our Wedding! 💕",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Wedding Invitation</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 60px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">
                    You're Invited!
                  </h1>
                  <p style="margin: 15px 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 300;">
                    Join us in celebrating our special day
                  </p>
                </div>

                <!-- Content -->
                <div style="padding: 50px 40px;">
                  <p style="margin: 0 0 25px; color: #1a1a1a; font-size: 16px; line-height: 1.6;">
                    Dear ${guest.first_name}${guest.last_name ? ` ${guest.last_name}` : ""},
                  </p>

                  <p style="margin: 0 0 30px; color: #1a1a1a; font-size: 16px; line-height: 1.6;">
                    We're thrilled to invite you to our wedding celebration! Your presence would mean the world to us as we begin this new chapter together.
                  </p>

                  <!-- RSVP Box -->
                  <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #667eea; padding: 25px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0 0 12px; color: #495057; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Your Invitation Code
                    </p>
                    <p style="margin: 0 0 20px;">
                      <span style="display: inline-block; background: #ffffff; padding: 12px 20px; border-radius: 6px; font-size: 24px; font-weight: 700; color: #667eea; letter-spacing: 2px; font-family: 'Courier New', monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${guest.invite_code}
                      </span>
                    </p>
                    <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.5;">
                      Use this code to RSVP and let us know if you'll be joining us.
                    </p>
                  </div>

                  <!-- RSVP Button -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${rsvpUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                      RSVP Now
                    </a>
                  </div>

                  <p style="margin: 30px 0 0; color: #6c757d; font-size: 14px; line-height: 1.6; text-align: center;">
                    Can't click the button? Copy and paste this link into your browser:<br>
                    <a href="${rsvpUrl}" style="color: #667eea; text-decoration: none; word-break: break-all;">${rsvpUrl}</a>
                  </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px; color: #1a1a1a; font-size: 16px; font-weight: 500;">
                    We can't wait to celebrate with you! 💕
                  </p>
                  <p style="margin: 0; color: #6c757d; font-size: 13px;">
                    If you have any questions, please don't hesitate to reach out.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
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
