import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { getHotelInterestNotificationEmail } from "@/lib/email/templates/hotel-interest-notification";

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
    if (!getResendClient() || !env.RSVP_EMAIL) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const adminUrl = `${appUrl}/admin/guests`;

    // Generate email HTML
    const emailHtml = getHotelInterestNotificationEmail({
      guestFirstName: primaryGuest.firstName,
      guestLastName: primaryGuest.lastName,
      guestEmail: primaryGuest.email,
      guestPhone: primaryGuest.phoneNumber,
      hotelName: hotel.name,
      hotelAddress: hotel.address,
      checkInDate: interest?.checkInDate
        ? new Date(interest.checkInDate).toISOString()
        : null,
      checkOutDate: interest?.checkOutDate
        ? new Date(interest.checkOutDate).toISOString()
        : null,
      numberOfRooms: interest?.numberOfRooms ?? null,
      notes: interest?.notes ?? null,
      adminUrl,
    });

    // Determine recipients (only admin for now)
    const recipients = [env.RSVP_EMAIL];

    try {
      // Send email to admin and travel agent
      const result = await sendEmail({
        from: "Wedding Website <rsvp@helen-and-enrique.com>",
        to: recipients,
        subject: `Hotel Interest: ${primaryGuest.firstName} ${primaryGuest.lastName || ""} - ${hotel.name}`,
        html: emailHtml,
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
