import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * List public photos
 * @description Fetch all active photos for the public gallery
 * @response 200:PhotoListResponse
 * @tag Photos
 * @openapi
 */
export async function GET() {
  try {
    const weddingId = await getWeddingId();

    const photos = await db
      .selectFrom("photos")
      .where("wedding_id", "=", weddingId)
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
