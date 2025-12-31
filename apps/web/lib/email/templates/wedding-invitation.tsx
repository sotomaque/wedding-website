interface WeddingInvitationEmailProps {
  firstName: string;
  lastName?: string | null;
  inviteCode: string;
  rsvpUrl: string;
  appUrl: string;
}

/**
 * Wedding invitation email template with personalized background photo
 * Features a blurred background image similar to the RSVP page design
 */
export function getWeddingInvitationEmail({
  firstName,
  lastName,
  inviteCode,
  rsvpUrl,
  appUrl,
}: WeddingInvitationEmailProps): string {
  const fullName = `${firstName}${lastName ? ` ${lastName}` : ""}`;
  const manualRsvpUrl = `${appUrl}/rsvp`;

  // Use a romantic photo for the email background (must be absolute URL for emails)
  const backgroundImageUrl = `${appUrl}/our-photos/la-jolla.jpeg`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wedding Invitation - Helen & Enrique</title>
        <style>
          /* Copy button hover effect */
          .copy-code:hover {
            cursor: pointer;
            transform: scale(1.02);
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

          <!-- Hero Section with Background Image -->
          <!-- Using table-based layout for better email client support -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
            <tr>
              <td style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.92) 0%, rgba(118, 75, 162, 0.92) 100%), url(${backgroundImageUrl}) center/cover; padding: 80px 40px; text-align: center;">
                <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 48px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                  You're Invited
                </h1>
                <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
                  </tr>
                </table>
                <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                  Helen & Enrique
                </p>
                <p style="margin: 15px 0 0; color: rgba(255,255,255,0.98); font-size: 16px; font-weight: 300; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                  Join us in celebrating our special day
                </p>
              </td>
            </tr>
          </table>

          <!-- Main Content -->
          <div style="padding: 50px 40px; background-color: #ffffff;">
            <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
              Dear ${fullName},
            </p>

            <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
              We're thrilled to invite you to our wedding celebration! Your presence would mean the world to us as we begin this new chapter together in beautiful San Diego.
            </p>

            <!-- Invitation Code Card -->
            <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #667eea; padding: 30px; margin: 40px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <p style="margin: 0 0 15px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Your Personal Invitation Code
              </p>
              <div style="margin: 0 0 20px;">
                <span
                  id="invite-code"
                  class="copy-code"
                  onclick="navigator.clipboard.writeText('${inviteCode}').then(function() { alert('Code copied to clipboard: ${inviteCode}'); });"
                  style="display: inline-block; background: #ffffff; padding: 16px 28px; border-radius: 8px; font-size: 32px; font-weight: 700; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace; box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;"
                  title="Click to copy code"
                >
                  ${inviteCode}
                </span>
              </div>
              <p style="margin: 0 0 12px; color: #718096; font-size: 14px; line-height: 1.6;">
                <strong>💡 Tip:</strong> Click the code above to copy it to your clipboard.
              </p>
              <p style="margin: 0; color: #718096; font-size: 13px; line-height: 1.6;">
                Use this unique code to RSVP and let us know if you'll be joining us.
              </p>
            </div>

            <!-- RSVP Button -->
            <div style="text-align: center; margin: 45px 0;">
              <a
                href="${rsvpUrl}"
                style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;"
              >
                RSVP Now
              </a>
            </div>

            <!-- Event Details Hint -->
            <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 40px 0; text-align: center;">
              <p style="margin: 0 0 10px; color: #2d3748; font-size: 15px; font-weight: 600;">
                📍 San Diego, California
              </p>
              <p style="margin: 0; color: #718096; font-size: 14px;">
                Full details and schedule available after RSVP
              </p>
            </div>

            <!-- Alternative Instructions -->
            <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 40px 0;">
              <p style="margin: 0 0 12px; color: #92400e; font-size: 14px; font-weight: 600;">
                ⚠️ If the button doesn't work:
              </p>
              <ol style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px; line-height: 1.8;">
                <li style="margin-bottom: 8px;">
                  Click the invitation code above to copy it
                </li>
                <li style="margin-bottom: 8px;">
                  Visit <a href="${manualRsvpUrl}" style="color: #667eea; text-decoration: none; font-weight: 600;">${manualRsvpUrl}</a>
                </li>
                <li>
                  Enter your code manually on the RSVP page
                </li>
              </ol>
            </div>

            <!-- Link Fallback -->
            <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              Direct RSVP link (copy if button doesn't work):<br>
              <a href="${rsvpUrl}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 11px;">${rsvpUrl}</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
              We can't wait to celebrate with you! 💕
            </p>
            <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
              If you have any questions, please don't hesitate to reach out.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
