import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { weddingUrl } from "@/lib/url";

/**
 * Send hotel interest notification
 * @description Send a notification email to admin when a guest expresses interest in a hotel booking
 * @body HotelInterestBody
 * @response 200:SuccessResponse
 * @tag Admin - Hotels
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, hotelId } = body;

    if (!inviteCode || !hotelId) {
      return NextResponse.json(
        { error: "Invite code and hotel ID are required" },
        { status: 400 },
      );
    }

    const weddingId = await getWeddingId();

    // Fetch guest details
    const guests = await db.guest.findMany({
      where: { inviteCode: inviteCode.toUpperCase(), weddingId },
    });

    if (guests.length === 0) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Get primary guest (non-plus-one)
    const primaryGuest = guests.find((g) => !g.isPlusOne) || guests[0];

    if (!primaryGuest) {
      return NextResponse.json(
        { error: "Primary guest not found" },
        { status: 404 },
      );
    }

    // Fetch hotel details
    const hotel = await db.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // Fetch hotel interest details
    const interest = await db.guestHotelInterest.findFirst({
      where: {
        hotelId: hotelId,
        inviteCode: inviteCode.toUpperCase(),
        weddingId,
      },
    });

    // Check if email is configured
    const settings = await getWeddingSettings();
    const recipients = getNotificationRecipients(settings);
    if (!getResendClient() || recipients.length === 0) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    const adminUrl = `${weddingUrl(settings.slug, "/admin/guests")}`;

    // Render email from DB template
    const rendered = await renderEmailTemplate(
      weddingId,
      "hotel_interest_notification",
      {
        GUEST_FIRST_NAME: primaryGuest.firstName,
        GUEST_LAST_NAME: primaryGuest.lastName || "",
        GUEST_EMAIL: primaryGuest.email || "",
        GUEST_PHONE: primaryGuest.phoneNumber || "",
        HOTEL_NAME: hotel.name,
        HOTEL_ADDRESS: hotel.address || "",
        CHECK_IN_DATE: interest?.checkInDate
          ? new Date(interest.checkInDate).toISOString()
          : "",
        CHECK_OUT_DATE: interest?.checkOutDate
          ? new Date(interest.checkOutDate).toISOString()
          : "",
        NUMBER_OF_ROOMS: interest?.numberOfRooms
          ? String(interest.numberOfRooms)
          : "",
        NOTES: interest?.notes ?? "",
        ADMIN_URL: adminUrl,
      },
    );

    if (!rendered) {
      return NextResponse.json(
        {
          error:
            "Hotel interest notification template is inactive or not found",
        },
        { status: 500 },
      );
    }

    try {
      // Send email to admin and travel agent
      const result = await sendEmail({
        from: getEmailFromAddress(settings, "Wedding Website"),
        to: recipients,
        subject: rendered.subject,
        html: rendered.html,
      });

      if (result.error) {
        console.error("Error sending hotel interest email:", result.error);
        return NextResponse.json(
          { error: "Failed to send hotel interest email" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Hotel interest notification sent successfully",
        recipients,
      });
    } catch (emailError) {
      console.error("Error sending hotel interest email:", emailError);
      return NextResponse.json(
        { error: "Failed to send hotel interest email" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(
      "Error in POST /api/admin/hotels/send-interest-notification:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
