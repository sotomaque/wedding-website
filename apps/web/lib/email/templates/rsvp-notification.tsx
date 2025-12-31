interface RsvpNotificationEmailProps {
  guests: Array<{
    firstName: string;
    lastName?: string | null;
    email?: string | null;
  }>;
  inviteCode: string;
  attending: boolean;
  dietaryRestrictions?: string | null;
  submittedAt: string;
}

/**
 * RSVP notification email template sent to admin when someone submits their RSVP
 */
export function getRsvpNotificationEmail({
  guests,
  inviteCode,
  attending,
  dietaryRestrictions,
  submittedAt,
}: RsvpNotificationEmailProps): string {
  const guestNames = guests
    .map((g) => `${g.firstName}${g.lastName ? ` ${g.lastName}` : ""}`)
    .join(", ");

  const guestEmails = guests
    .filter((g) => g.email)
    .map((g) => g.email)
    .join(", ");

  const statusColor = attending ? "#48bb78" : "#f56565";
  const statusText = attending ? "Attending" : "Not Attending";
  const statusEmoji = attending ? "✅" : "❌";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New RSVP Submission</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
              ${statusEmoji} New RSVP Submission
            </h1>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px;">

            <!-- Status Badge -->
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: 600;">
                ${statusText}
              </span>
            </div>

            <!-- Guest Details Card -->
            <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Guest(s)</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px;">
                    <span style="color: #2d3748; font-size: 18px; font-weight: 600;">${guestNames}</span>
                  </td>
                </tr>
                ${
                  guestEmails
                    ? `
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email(s)</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px;">
                    <span style="color: #4a5568; font-size: 14px;">${guestEmails}</span>
                  </td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Invite Code</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px;">
                    <span style="display: inline-block; background: #edf2f7; padding: 8px 16px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #667eea; letter-spacing: 2px;">${inviteCode}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Submitted At</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <span style="color: #4a5568; font-size: 14px;">${submittedAt}</span>
                  </td>
                </tr>
              </table>
            </div>

            ${
              dietaryRestrictions
                ? `
            <!-- Dietary Restrictions -->
            <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                🍽️ Dietary Restrictions
              </p>
              <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">
                ${dietaryRestrictions}
              </p>
            </div>
            `
                : ""
            }

            <!-- Guest Count Summary -->
            <div style="background: ${attending ? "#f0fff4" : "#fff5f5"}; border: 1px solid ${attending ? "#68d391" : "#fc8181"}; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0; color: ${attending ? "#276749" : "#c53030"}; font-size: 14px;">
                ${guests.length > 1 ? `${guests.length} guests` : "1 guest"} ${attending ? "confirmed" : "declined"}
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #718096; font-size: 13px;">
              This is an automated notification from your wedding website.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
