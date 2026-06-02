import type { PhotoSection } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";

const VALID_SECTIONS: readonly PhotoSection[] = ["hero", "story", "gallery"];

function isPhotoSection(value: unknown): value is PhotoSection {
  return (
    typeof value === "string" &&
    (VALID_SECTIONS as readonly string[]).includes(value)
  );
}

/**
 * Reorder a section's placements
 * @description Rewrite displayOrder for an entire section from an ordered list
 * of placement IDs, in a single transaction (collision-free, unlike pairwise
 * swaps). All IDs must belong to the given section of this wedding.
 * @body ReorderPlacementsBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Photos
 * @openapi
 */
export async function PUT(request: NextRequest) {
  try {
    const { weddingId, slug } = await getWeddingContext();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { section, orderedPlacementIds } = body;

    if (!isPhotoSection(section) || !Array.isArray(orderedPlacementIds)) {
      return NextResponse.json(
        { error: "A valid section and orderedPlacementIds[] are required" },
        { status: 400 },
      );
    }

    // Every supplied placement must belong to this wedding + section, and the
    // list must cover exactly that section's placements (no partial reorders
    // that would leave stale orders behind).
    const existing = await db.photoPlacement.findMany({
      where: { weddingId, section },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((p) => p.id));
    const suppliedIds = new Set<string>(orderedPlacementIds);

    if (
      suppliedIds.size !== orderedPlacementIds.length ||
      suppliedIds.size !== existingIds.size ||
      !orderedPlacementIds.every((id: string) => existingIds.has(id))
    ) {
      return NextResponse.json(
        { error: "orderedPlacementIds must list this section's placements" },
        { status: 400 },
      );
    }

    await db.$transaction(
      orderedPlacementIds.map((id: string, index: number) =>
        db.photoPlacement.update({
          where: { id },
          data: { displayOrder: index },
        }),
      ),
    );

    revalidatePath(`/${slug}`, "layout");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/admin/photos/placements/reorder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
