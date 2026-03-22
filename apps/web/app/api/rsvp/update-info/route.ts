import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Update guest contact info
 * @description Update guest contact information including mailing address, phone, WhatsApp, and preferred contact method
 * @body UpdateGuestInfoBody
 * @response 200:SuccessResponse
 * @tag RSVP
 * @openapi
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

    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);

    // Fetch all guests with this invite code
    const guests = await db
      .selectFrom("guests")
      .where("wedding_id", "=", weddingId)
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
    await weddingDb
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
      .where("wedding_id", "=", weddingId)
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
