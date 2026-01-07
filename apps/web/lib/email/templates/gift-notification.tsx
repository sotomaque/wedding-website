interface GiftNotificationEmailProps {
  donorName: string | null;
  donorEmail: string | null;
  amount: number; // in dollars
  currency: string;
  giftType: string | null;
  matchedGuest: {
    firstName: string;
    lastName: string | null;
  } | null;
  chargeId: string;
  submittedAt: string;
}

/**
 * Gift notification email template sent to admin when someone makes a gift
 * Note: This is a fallback HTML template. The primary template is in Resend.
 */
export function getGiftNotificationEmail({
  donorName,
  donorEmail,
  amount,
  currency,
  giftType,
  matchedGuest,
  chargeId,
  submittedAt,
}: GiftNotificationEmailProps): string {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);

  const giftTypeLabel = giftType
    ? giftType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "General Gift";

  const giftEmoji =
    giftType === "baby_fund"
      ? "👶"
      : giftType === "honeymoon"
        ? "🏝️"
        : giftType === "student_loans"
          ? "🎓"
          : "🎁";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Gift Received</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
              ${giftEmoji} New Gift Received!
            </h1>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px;">

            <!-- Amount Badge -->
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="display: inline-block; background-color: #48bb78; color: #ffffff; padding: 16px 32px; border-radius: 50px; font-size: 24px; font-weight: 700;">
                ${formattedAmount}
              </span>
            </div>

            <!-- Gift Details Card -->
            <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Gift Type</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px;">
                    <span style="color: #2d3748; font-size: 18px; font-weight: 600;">${giftEmoji} ${giftTypeLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Donor Name</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px;">
                    <span style="color: #2d3748; font-size: 16px;">${donorName || "Anonymous"}</span>
                  </td>
                </tr>
                ${
                  donorEmail
                    ? `
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Donor Email</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px;">
                    <span style="color: #4a5568; font-size: 14px;">${donorEmail}</span>
                  </td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Received At</span>
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
              matchedGuest
                ? `
            <!-- Matched Guest -->
            <div style="background: #ebf8ff; border: 1px solid #90cdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; color: #2b6cb0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                ✅ Matched to Guest
              </p>
              <p style="margin: 0; color: #2c5282; font-size: 16px; font-weight: 600;">
                ${matchedGuest.firstName}${matchedGuest.lastName ? ` ${matchedGuest.lastName}` : ""}
              </p>
            </div>
            `
                : `
            <!-- No Match -->
            <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ℹ️ No matching guest found in the guest list
              </p>
            </div>
            `
            }

            <!-- Transaction ID -->
            <div style="text-align: center; padding: 16px; background: #f7fafc; border-radius: 8px;">
              <p style="margin: 0; color: #718096; font-size: 12px;">
                Transaction ID: <code style="background: #edf2f7; padding: 2px 6px; border-radius: 4px;">${chargeId}</code>
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
