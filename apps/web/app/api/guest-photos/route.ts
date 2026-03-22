import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * List visible guest photos
 * @description Fetch all guest-submitted photos that are visible (public)
 * @response 200:GuestPhotoListResponse
 * @tag Guest Photos
 * @openapi
 */
export async function GET() {
  try {
    const photos = await db.guestPhoto.findMany({
      where: { isVisible: true },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Error in GET /api/guest-photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
