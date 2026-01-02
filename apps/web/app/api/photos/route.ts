import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/photos
 * Fetch all active photos (public)
 */
export async function GET() {
  try {
    const photos = await db
      .selectFrom("photos")
      .selectAll()
      .where("is_active", "=", true)
      .orderBy("display_order", "asc")
      .execute();

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Error in GET /api/photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
