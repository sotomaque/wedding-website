import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/rsvp/submit
 * Submit RSVP response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, attending, dietaryRestrictions } = body;

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 },
      );
    }

    // Kysely query - update all guests with this invite code
    await db
      .updateTable("guests")
      .set({
        rsvp_status: attending ? "yes" : "no",
        dietary_restrictions: dietaryRestrictions || null,
      })
      .where("invite_code", "=", inviteCode.toUpperCase())
      .execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/rsvp/submit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
