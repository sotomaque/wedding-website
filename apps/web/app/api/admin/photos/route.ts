import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * List all photos
 * @description Fetch all photos including inactive ones (admin only)
 * @response 200:PhotoListResponse
 * @auth bearer
 * @tag Admin - Photos
 * @openapi
 */
export async function GET() {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const photos = await db.photo.findMany({
      where: { weddingId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Error in GET /api/admin/photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Create a photo
 * @description Add a new photo to the gallery (admin only)
 * @body CreatePhotoBody
 * @response 201:CreatePhotoResponse
 * @auth bearer
 * @tag Admin - Photos
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { url, alt, description } = body;

    if (!url || !alt) {
      return NextResponse.json(
        { error: "URL and alt text are required" },
        { status: 400 },
      );
    }

    // Get the highest display_order
    const maxOrderResult = await db.photo.aggregate({
      where: { weddingId },
      _max: { displayOrder: true },
    });

    const newOrder = (maxOrderResult._max.displayOrder ?? -1) + 1;

    const photo = await db.photo.create({
      data: {
        url,
        alt,
        description: description || null,
        displayOrder: newOrder,
        isActive: true,
        weddingId,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
