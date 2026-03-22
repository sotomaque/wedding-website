import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Verify invite code
 * @description Verify an invite code and return associated guests
 * @params RsvpVerifyParams
 * @response 200:RsvpVerifyResponse
 * @tag RSVP
 * @openapi
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 },
      );
    }

    const weddingId = await getWeddingId();

    const guests = await db.guest.findMany({
      where: { inviteCode: code.toUpperCase(), weddingId },
    });

    if (!guests || guests.length === 0) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    return NextResponse.json({ guests });
  } catch (error) {
    console.error("Error in GET /api/rsvp/verify:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
