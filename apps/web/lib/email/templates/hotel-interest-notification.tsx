interface HotelInterestNotificationEmailProps {
  guestFirstName: string;
  guestLastName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  hotelName: string;
  hotelAddress?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  numberOfRooms?: number | null;
  notes?: string | null;
  adminUrl: string;
}

/**
 * Hotel interest notification email template
 * Sent to admin/travel agent when a guest expresses interest in a hotel
 */
export function getHotelInterestNotificationEmail({
  guestFirstName,
  guestLastName,
  guestEmail,
  guestPhone,
  hotelName,
  hotelAddress,
  checkInDate,
  checkOutDate,
  numberOfRooms,
  notes,
  adminUrl,
}: HotelInterestNotificationEmailProps): string {
  const fullName = `${guestFirstName}${guestLastName ? ` ${guestLastName}` : ""}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hotel Interest: ${fullName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
              🏨 New Hotel Interest
            </h1>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px; background-color: #ffffff;">
            <p style="margin: 0 0 20px; color: #2d3748; font-size: 16px; line-height: 1.6;">
              A guest has expressed interest in a hotel for your wedding.
            </p>

            <!-- Guest Information -->
            <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h2 style="margin: 0 0 15px; color: #1e293b; font-size: 18px; font-weight: 600;">
                Guest Information
              </h2>
              <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
                <strong>Name:</strong> ${fullName}
              </p>
              ${
                guestEmail
                  ? `
              <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
                <strong>Email:</strong> <a href="mailto:${guestEmail}" style="color: #6366f1; text-decoration: none;">${guestEmail}</a>
              </p>
              `
                  : ""
              }
              ${
                guestPhone
                  ? `
              <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
                <strong>Phone:</strong> <a href="tel:${guestPhone}" style="color: #6366f1; text-decoration: none;">${guestPhone}</a>
              </p>
              `
                  : ""
              }
            </div>

            <!-- Hotel Information -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h2 style="margin: 0 0 15px; color: #78350f; font-size: 18px; font-weight: 600;">
                Hotel Interest
              </h2>
              <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
                <strong>Hotel:</strong> ${hotelName}
              </p>
              ${
                hotelAddress
                  ? `
              <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
                <strong>Address:</strong> ${hotelAddress}
              </p>
              `
                  : ""
              }
              ${
                checkInDate && checkOutDate
                  ? `
              <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
                <strong>Dates:</strong> ${new Date(checkInDate).toLocaleDateString()} - ${new Date(checkOutDate).toLocaleDateString()}
              </p>
              `
                  : ""
              }
              ${
                numberOfRooms
                  ? `
              <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
                <strong>Number of Rooms:</strong> ${numberOfRooms}
              </p>
              `
                  : ""
              }
              ${
                notes
                  ? `
              <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
                <strong>Notes:</strong> ${notes}
              </p>
              `
                  : ""
              }
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.25);">
                View Guest Details
              </a>
            </div>

            <!-- Footer Note -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                This notification was sent because ${fullName} marked their interest in ${hotelName} on your wedding website.
              </p>
            </div>
          </div>

          <!-- Email Footer -->
          <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
              Helen & Enrique's Wedding<br>
              Wedding Website Admin Notification
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
