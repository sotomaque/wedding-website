import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Delete several guests at once (e.g. clearing junk self-registrations).
 * Scoped to the current wedding; cascades each guest's invites, plus-ones, and
 * related records.
 *
 * @description Bulk delete guests
 * @body BulkGuestIdsBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json().catch(() => null);
    const guestIds: unknown = body?.guestIds;
    if (
      !Array.isArray(guestIds) ||
      guestIds.length === 0 ||
      !guestIds.every((id) => typeof id === "string")
    ) {
      return NextResponse.json(
        { error: "guestIds must be a non-empty array of strings" },
        { status: 400 },
      );
    }

    // deleteMany scoped by weddingId so a caller can't delete another wedding's
    // guests by passing foreign ids.
    const result = await db.guest.deleteMany({
      where: { id: { in: guestIds as string[] }, weddingId },
    });

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error("Error in POST /api/admin/guests/bulk-delete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
