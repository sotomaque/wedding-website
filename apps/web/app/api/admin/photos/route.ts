import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
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

    const weddingId = await getWeddingId();

    const photos = await db
      .selectFrom("photos")
      .where("wedding_id", "=", weddingId)
      .selectAll()
      .orderBy("display_order", "asc")
      .orderBy("created_at", "desc")
      .execute();

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

    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);

    // Get the highest display_order
    const maxOrder = await db
      .selectFrom("photos")
      .where("wedding_id", "=", weddingId)
      .select(db.fn.max("display_order").as("max_order"))
      .executeTakeFirst();

    const newOrder = (maxOrder?.max_order ?? -1) + 1;

    const photo = await weddingDb
      .insertInto("photos", {
        url,
        alt,
        description: description || null,
        display_order: newOrder,
        is_active: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
