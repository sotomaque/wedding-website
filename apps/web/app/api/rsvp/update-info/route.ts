import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { rsvpUpdateInfoSchema } from "@/lib/validations/rsvp";

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
    const body = await request.json().catch(() => null);
    const parsed = rsvpUpdateInfoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const {
      inviteCode,
      mailingAddress,
      phoneNumber,
      whatsapp,
      preferredContactMethod,
    } = parsed.data;

    const normalizedCode = inviteCode.toUpperCase().trim();
    const weddingId = await getWeddingId();

    // Fetch all guests with this invite code
    const guests = await db.guest.findMany({
      where: { inviteCode: normalizedCode, weddingId },
    });

    if (guests.length === 0) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    // Update all guests with this invite code (primary + plus one)
    await db.guest.updateMany({
      where: { inviteCode: normalizedCode, weddingId },
      data: {
        mailingAddress: mailingAddress || null,
        phoneNumber: phoneNumber || null,
        whatsapp: whatsapp || null,
        preferredContactMethod: preferredContactMethod || null,
      },
    });

    // Fetch updated guests
    const updatedGuests = await db.guest.findMany({
      where: { inviteCode: normalizedCode, weddingId },
    });

    return NextResponse.json({ guests: updatedGuests });
  } catch (error) {
    console.error("Error in PATCH /api/rsvp/update-info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
