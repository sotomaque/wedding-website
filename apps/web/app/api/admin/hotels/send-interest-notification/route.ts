import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
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

    // Fetch guest details
    const guests = await db
      .selectFrom("guests")
      .selectAll()
      .where("invite_code", "=", inviteCode.toUpperCase())
      .execute();

    if (guests.length === 0) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Get primary guest (non-plus-one)
    const primaryGuest = guests.find((g) => !g.is_plus_one) || guests[0];

    if (!primaryGuest) {
      return NextResponse.json(
        { error: "Primary guest not found" },
        { status: 404 },
      );
    }

    // Fetch hotel details
    const hotel = await db
      .selectFrom("hotels")
      .selectAll()
      .where("id", "=", hotelId)
      .executeTakeFirst();

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // Fetch hotel interest details
    const interest = await db
      .selectFrom("guest_hotel_interests")
      .selectAll()
      .where("hotel_id", "=", hotelId)
      .where("invite_code", "=", inviteCode.toUpperCase())
      .executeTakeFirst();

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
      guestFirstName: primaryGuest.first_name,
      guestLastName: primaryGuest.last_name,
      guestEmail: primaryGuest.email,
      guestPhone: primaryGuest.phone_number,
      hotelName: hotel.name,
      hotelAddress: hotel.address,
      checkInDate: interest?.check_in_date
        ? new Date(interest.check_in_date).toISOString()
        : null,
      checkOutDate: interest?.check_out_date
        ? new Date(interest.check_out_date).toISOString()
        : null,
      numberOfRooms: interest?.number_of_rooms ?? null,
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
        subject: `Hotel Interest: ${primaryGuest.first_name} ${primaryGuest.last_name || ""} - ${hotel.name}`,
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
