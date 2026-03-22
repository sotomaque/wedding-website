import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

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
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const photos = await db.photo.findMany({
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
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
