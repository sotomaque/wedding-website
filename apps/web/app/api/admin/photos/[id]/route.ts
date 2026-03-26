import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Update a photo
 * @description Update photo metadata such as alt text, description, display order, or active status
 * @pathParams IdParams
 * @body UpdatePhotoBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Photos
 * @openapi
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await context.params;
    const body = await request.json();
    const { alt, description, displayOrder, isActive } = body;

    const updateData: Record<string, unknown> = {};

    if (alt !== undefined) updateData.alt = alt;
    if (description !== undefined) updateData.description = description || null;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    // Check if photo exists and belongs to this wedding
    const existing = await db.photo.findUnique({ where: { id } });
    if (!existing || existing.weddingId !== weddingId) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const photo = await db.photo.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Error in PATCH /api/admin/photos/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Delete a photo
 * @description Permanently delete a photo by its ID
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Photos
 * @openapi
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await context.params;

    const existing = await db.photo.findUnique({ where: { id } });
    if (!existing || existing.weddingId !== weddingId) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    await db.photo.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/photos/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
