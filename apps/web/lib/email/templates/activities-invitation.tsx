interface ActivitiesInvitationEmailProps {
  firstName: string;
  lastName?: string | null;
  inviteCode: string;
  thingsToDoUrl: string;
  appUrl: string;
}

/**
 * Activities invitation email template
 * Sent to guests who have already RSVP'd to invite them to explore activities
 */
export function getActivitiesInvitationEmail({
  firstName,
  lastName,
  inviteCode,
  thingsToDoUrl,
  appUrl,
}: ActivitiesInvitationEmailProps): string {
  const fullName = `${firstName}${lastName ? ` ${lastName}` : ""}`;

  // Use a San Diego photo for the email background
  const backgroundImageUrl = `${appUrl}/things-to-do/la-jolla-cove.webp`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Explore San Diego - Helen & Enrique's Wedding</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

          <!-- Hero Section with Background Image -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
            <tr>
              <td style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.88) 0%, rgba(59, 130, 246, 0.88) 100%), url(${backgroundImageUrl}) center/cover; padding: 70px 40px; text-align: center;">
                <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 42px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                  Explore San Diego
                </h1>
                <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
                  </tr>
                </table>
                <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                  Our Favorite Places to Visit
                </p>
              </td>
            </tr>
          </table>

          <!-- Main Content -->
          <div style="padding: 50px 40px; background-color: #ffffff;">
            <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
              Dear ${fullName},
            </p>

            <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.8;">
              Thank you so much for RSVPing to our wedding! We're so excited to celebrate with you in San Diego.
            </p>

            <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
              To help you make the most of your trip, we've put together a guide to our favorite spots in the city. You can also let us know which places you're planning to visit - and see who else might be going!
            </p>

            <!-- Feature Highlights -->
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 30px 0;">
              <p style="margin: 0 0 15px; color: #0369a1; font-size: 15px; font-weight: 600;">
                What you can do:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                    <span style="color: #0ea5e9; font-size: 18px; margin-right: 10px;">🗺️</span>
                    Browse our favorite beaches, restaurants, and attractions
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                    <span style="color: #0ea5e9; font-size: 18px; margin-right: 10px;">👀</span>
                    See which guests are planning to visit the same spots
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                    <span style="color: #0ea5e9; font-size: 18px; margin-right: 10px;">✨</span>
                    Mark activities you're interested in or committed to
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 45px 0;">
              <a
                href="${thingsToDoUrl}"
                style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);"
              >
                Explore Things to Do
              </a>
            </div>

            <!-- Invite Code Reminder -->
            <div style="background: #f7fafc; border-left: 4px solid #0ea5e9; padding: 20px; margin: 40px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 10px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Your Invite Code
              </p>
              <p style="margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #0ea5e9; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                ${inviteCode}
              </p>
              <p style="margin: 0; color: #718096; font-size: 13px;">
                Your activities will be linked to your invite code - no login required!
              </p>
            </div>

            <!-- Link Fallback -->
            <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              Direct link (copy if button doesn't work):<br>
              <a href="${thingsToDoUrl}" style="color: #0ea5e9; text-decoration: none; word-break: break-all; font-size: 11px;">${thingsToDoUrl}</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
              See you in San Diego! 🌴
            </p>
            <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
              Helen & Enrique
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
