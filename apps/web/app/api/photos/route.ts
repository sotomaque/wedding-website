import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * List public photos
 * @description Fetch all active photos for the public gallery
 * @response 200:PhotoListResponse
 * @tag Photos
 * @openapi
 */
export async function GET() {
  try {
    const photos = await db.photo.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Error in GET /api/photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
