import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      attending,
      plusOne,
      travel,
      needsAccommodation,
      dietary,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !attending) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const isAttending = attending === "Joyfully accepts";

    // Send email notification
    const { data, error } = await resend.emails.send({
      from: "RSVP Notifications <onboarding@resend.dev>", // Update this to your verified domain
      to: process.env.RSVP_EMAIL || "your-email@example.com",
      subject: `${isAttending ? "✅" : "❌"} RSVP ${isAttending ? "Accepted" : "Declined"}: ${firstName} ${lastName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>RSVP Notification</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                  ${isAttending ? "🎉 New RSVP Accepted!" : "RSVP Declined"}
                </h1>
                <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                  ${new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px;">
                <!-- Guest Info -->
                <div style="margin-bottom: 30px;">
                  <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px; font-weight: 600; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                    Guest Information
                  </h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; color: #666; font-size: 14px; font-weight: 500; width: 140px;">Name:</td>
                      <td style="padding: 12px 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">${firstName} ${lastName}</td>
                    </tr>
                    <tr style="border-top: 1px solid #f0f0f0;">
                      <td style="padding: 12px 0; color: #666; font-size: 14px; font-weight: 500;">Email:</td>
                      <td style="padding: 12px 0;">
                        <a href="mailto:${email}" style="color: #667eea; text-decoration: none; font-size: 15px;">${email}</a>
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid #f0f0f0;">
                      <td style="padding: 12px 0; color: #666; font-size: 14px; font-weight: 500;">Status:</td>
                      <td style="padding: 12px 0;">
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; ${
                          isAttending
                            ? "background-color: #d4edda; color: #155724;"
                            : "background-color: #f8d7da; color: #721c24;"
                        }">
                          ${attending}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>

                ${
                  isAttending
                    ? `
                <!-- Event Details -->
                <div style="margin-bottom: 30px;">
                  <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px; font-weight: 600; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                    Event Details
                  </h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; color: #666; font-size: 14px; font-weight: 500; width: 140px;">Plus One:</td>
                      <td style="padding: 12px 0; color: #1a1a1a; font-size: 15px;">
                        ${plusOne ? "✅ Yes" : "❌ No"}
                      </td>
                    </tr>
                    ${
                      travel
                        ? `
                    <tr style="border-top: 1px solid #f0f0f0;">
                      <td style="padding: 12px 0; color: #666; font-size: 14px; font-weight: 500;">Traveling From:</td>
                      <td style="padding: 12px 0; color: #1a1a1a; font-size: 15px;">${travel}</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr style="border-top: 1px solid #f0f0f0;">
                      <td style="padding: 12px 0; color: #666; font-size: 14px; font-weight: 500;">Hotel Info:</td>
                      <td style="padding: 12px 0; color: #1a1a1a; font-size: 15px;">
                        ${needsAccommodation ? "✅ Requested" : "❌ Not needed"}
                      </td>
                    </tr>
                    ${
                      dietary
                        ? `
                    <tr style="border-top: 1px solid #f0f0f0;">
                      <td style="padding: 12px 0; color: #666; font-size: 14px; font-weight: 500; vertical-align: top;">Dietary Notes:</td>
                      <td style="padding: 12px 0; color: #1a1a1a; font-size: 15px; line-height: 1.5;">${dietary}</td>
                    </tr>
                    `
                        : ""
                    }
                  </table>
                </div>
                `
                    : ""
                }
              </div>

              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; color: #6c757d; font-size: 13px;">
                  Submitted at ${new Date().toLocaleString("en-US", {
                    timeZone: "America/Los_Angeles",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })} PST
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "RSVP submitted successfully",
      data,
    });
  } catch (error) {
    console.error("RSVP submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit RSVP" },
      { status: 500 },
    );
  }
}
