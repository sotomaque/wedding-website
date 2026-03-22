import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { forWedding } from "@/lib/db/scoped";
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
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);

    const result = await weddingDb
      .updateTable("guests")
      .set({ rsvp_status: rsvpStatus })
      .where("id", "in", guestIds)
      .execute();

    return NextResponse.json({
      success: true,
      updatedCount: Number(result[0]?.numUpdatedRows ?? 0),
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
