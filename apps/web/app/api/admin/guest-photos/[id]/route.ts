import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Toggle guest photo visibility
 * @description Hide or show a guest-submitted photo (admin only)
 * @body ToggleGuestPhotoBody
 * @response 200:GuestPhotoResponse
 * @auth bearer
 * @tag Admin - Guest Photos
 * @openapi
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await params;
    const body = await request.json();
    const { isVisible } = body as { isVisible: boolean };

    // Check if photo exists first
    const existing = await db.guestPhoto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Get current user's email for audit trail
    const user = await currentUser();
    const userEmail =
      user?.emailAddresses[0]?.emailAddress?.toLowerCase() ?? null;

    const photo = await db.guestPhoto.update({
      where: { id },
      data: {
        isVisible,
        hiddenAt: isVisible ? null : new Date(),
        hiddenBy: isVisible ? null : userEmail,
      },
    });

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Error in PATCH /api/admin/guest-photos/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Delete a guest photo
 * @description Permanently delete a guest-submitted photo (admin only)
 * @response 200:DeleteGuestPhotoResponse
 * @auth bearer
 * @tag Admin - Guest Photos
 * @openapi
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await params;

    const existing = await db.guestPhoto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const photo = await db.guestPhoto.delete({ where: { id } });

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Error in DELETE /api/admin/guest-photos/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
