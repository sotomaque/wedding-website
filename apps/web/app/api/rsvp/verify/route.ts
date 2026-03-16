import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // Kysely query - find all guests with this invite code
    const guests = await db
      .selectFrom("guests")
      .selectAll()
      .where("invite_code", "=", code.toUpperCase())
      .execute();

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
