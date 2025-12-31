import { NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";

/**
 * GET /api/test-email
 * Test endpoint to verify Resend email configuration
 */
export async function GET() {
  try {
    // Check if required env vars are set
    if (!env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY not configured" },
        { status: 500 },
      );
    }

    if (!env.RSVP_EMAIL) {
      return NextResponse.json(
        { error: "RSVP_EMAIL not configured" },
        { status: 500 },
      );
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const rsvpUrl = `${env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/rsvp?code=TEST-1234`;

    const result = await resend.emails.send({
      from: env.RSVP_EMAIL,
      to: env.RSVP_EMAIL, // Send to yourself for testing
      subject: "Test Email from Wedding Website",
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify your Resend configuration.</p>
        <p>If you're receiving this, email sending is working correctly!</p>
        <p>Your RSVP email would look like this:</p>
        <hr />
        <h2>You're Invited!</h2>
        <p>Hi Test Guest,</p>
        <p>We're excited to invite you to our wedding!</p>
        <p>Your invite code is: <strong>TEST-1234</strong></p>
        <p>Click the link below to RSVP:</p>
        <a href="${rsvpUrl}">${rsvpUrl}</a>
        <p>We can't wait to celebrate with you!</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      result,
      config: {
        from: env.RSVP_EMAIL,
        to: env.RSVP_EMAIL,
        hasResendKey: !!env.RESEND_API_KEY,
        appUrl: env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      },
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
