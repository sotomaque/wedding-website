import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * PATCH /api/rsvp/update-info
 * Update guest contact information (non-admin route)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      inviteCode,
      mailingAddress,
      phoneNumber,
      whatsapp,
      preferredContactMethod,
    } = body;

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 },
      );
    }

    // Fetch all guests with this invite code
    const guests = await db
      .selectFrom("guests")
      .selectAll()
      .where("invite_code", "=", inviteCode)
      .execute();

    if (guests.length === 0) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    // Update all guests with this invite code (primary + plus one)
    await db
      .updateTable("guests")
      .set({
        mailing_address: mailingAddress || null,
        phone_number: phoneNumber || null,
        whatsapp: whatsapp || null,
        preferred_contact_method: preferredContactMethod || null,
      })
      .where("invite_code", "=", inviteCode)
      .execute();

    // Fetch updated guests
    const updatedGuests = await db
      .selectFrom("guests")
      .selectAll()
      .where("invite_code", "=", inviteCode)
      .execute();

    return NextResponse.json({ guests: updatedGuests });
  } catch (error) {
    console.error("Error in PATCH /api/rsvp/update-info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
