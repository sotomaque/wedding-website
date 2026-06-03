import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Unassign a photo from a section
 * @description Remove a single placement by its ID (admin only). The library
 * photo itself is untouched.
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Photos
 * @openapi
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { weddingId, slug } = await getWeddingContext();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await context.params;

    const existing = await db.photoPlacement.findUnique({ where: { id } });
    if (!existing || existing.weddingId !== weddingId) {
      return NextResponse.json(
        { error: "Placement not found" },
        { status: 404 },
      );
    }

    await db.photoPlacement.delete({ where: { id } });

    revalidatePath(`/${slug}`, "layout");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/photos/placements/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
