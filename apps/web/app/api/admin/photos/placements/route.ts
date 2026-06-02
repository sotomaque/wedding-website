import type { PhotoSection } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";
import { getSectionPhotoCap } from "@/lib/templates";

const VALID_SECTIONS: readonly PhotoSection[] = ["hero", "story", "gallery"];

function isPhotoSection(value: unknown): value is PhotoSection {
  return (
    typeof value === "string" &&
    (VALID_SECTIONS as readonly string[]).includes(value)
  );
}

/**
 * List photo placements
 * @description Fetch all section placements for the wedding (admin only)
 * @response 200:PlacementListResponse
 * @auth bearer
 * @tag Admin - Photos
 * @openapi
 */
export async function GET() {
  try {
    const { weddingId } = await getWeddingContext();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const placements = await db.photoPlacement.findMany({
      where: { weddingId },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ placements });
  } catch (error) {
    console.error("Error in GET /api/admin/photos/placements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Assign a photo to a section
 * @description Place a library photo into a section, appended to the end of
 * that section's order. Idempotent — re-assigning an existing pair is a no-op.
 * @body CreatePlacementBody
 * @response 201:CreatePlacementResponse
 * @auth bearer
 * @tag Admin - Photos
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const { weddingId, slug } = await getWeddingContext();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { photoId, section } = body;

    if (!photoId || !isPhotoSection(section)) {
      return NextResponse.json(
        { error: "photoId and a valid section are required" },
        { status: 400 },
      );
    }

    // The photo must exist and belong to this wedding.
    const photo = await db.photo.findUnique({ where: { id: photoId } });
    if (!photo || photo.weddingId !== weddingId) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Enforce the section cap (e.g. hero). Skip if the photo is already placed
    // here (upsert below is a no-op then, so it shouldn't be blocked).
    const cap = getSectionPhotoCap(section);
    if (cap !== null) {
      const existing = await db.photoPlacement.findUnique({
        where: { photoId_section: { photoId, section } },
      });
      if (!existing) {
        const count = await db.photoPlacement.count({
          where: { weddingId, section },
        });
        if (count >= cap) {
          return NextResponse.json(
            { error: `The ${section} section holds at most ${cap} photos.` },
            { status: 400 },
          );
        }
      }
    }

    const maxOrderResult = await db.photoPlacement.aggregate({
      where: { weddingId, section },
      _max: { displayOrder: true },
    });
    const newOrder = (maxOrderResult._max.displayOrder ?? -1) + 1;

    // Upsert on the (photoId, section) unique so re-assigning is idempotent.
    const placement = await db.photoPlacement.upsert({
      where: { photoId_section: { photoId, section } },
      create: { photoId, weddingId, section, displayOrder: newOrder },
      update: {},
    });

    revalidatePath(`/${slug}`, "layout");

    return NextResponse.json({ placement }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/photos/placements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
