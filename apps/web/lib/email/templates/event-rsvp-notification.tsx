interface EventRsvpNotificationEmailProps {
  guest: {
    firstName: string;
    lastName?: string | null;
    email?: string | null;
  };
  inviteCode: string;
  eventName: string;
  attending: boolean;
  submittedAt: string;
}

/**
 * Event RSVP notification email template sent to admin when someone responds to an event invitation
 */
export function getEventRsvpNotificationEmail({
  guest,
  inviteCode,
  eventName,
  attending,
  submittedAt,
}: EventRsvpNotificationEmailProps): string {
  const guestName = `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`;

  const statusColor = attending ? "#48bb78" : "#f56565";
  const statusText = attending ? "Attending" : "Not Attending";
  const statusEmoji = attending ? "✅" : "❌";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event RSVP - ${eventName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 24px; font-weight: 600;">
              ${statusEmoji} Event RSVP Response
            </h1>
            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 18px;">
              ${eventName}
            </p>
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
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Guest</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px;">
                    <span style="color: #2d3748; font-size: 18px; font-weight: 600;">${guestName}</span>
                  </td>
                </tr>
                ${
                  guest.email
                    ? `
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px;">
                    <span style="color: #4a5568; font-size: 14px;">${guest.email}</span>
                  </td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Event</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px;">
                    <span style="color: #2d3748; font-size: 16px; font-weight: 500;">${eventName}</span>
                  </td>
                </tr>
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

            <!-- Response Summary -->
            <div style="background: ${attending ? "#f0fff4" : "#fff5f5"}; border: 1px solid ${attending ? "#68d391" : "#fc8181"}; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0; color: ${attending ? "#276749" : "#c53030"}; font-size: 14px;">
                Guest has ${attending ? "confirmed attendance" : "declined"} for ${eventName}
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
