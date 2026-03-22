import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Bulk set RSVP status for a list of guests (admin override)
 * @description Allows admins to set RSVP status for multiple guests at once
 * @body BulkSetRsvpBody
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

    const body = await request.json();
    const { guestIds, rsvpStatus } = body;

    if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json(
        { error: "guestIds array is required" },
        { status: 400 },
      );
    }

    if (!["yes", "no", "pending"].includes(rsvpStatus)) {
      return NextResponse.json(
        { error: "rsvpStatus must be yes, no, or pending" },
        { status: 400 },
      );
    }

    const result = await db.guest.updateMany({
      where: { id: { in: guestIds }, weddingId },
      data: { rsvpStatus },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      rsvpStatus,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/guests/bulk-set-rsvp:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
