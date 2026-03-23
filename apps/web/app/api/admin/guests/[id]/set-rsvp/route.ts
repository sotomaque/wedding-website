import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Set RSVP status for a specific guest (admin override)
 * @description Allows admins to set a guest's RSVP status to yes, no, or pending
 * @pathParams IdParams
 * @body SetRsvpBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id: guestId } = await params;
    const body = await request.json();
    const { rsvpStatus } = body;

    if (!["yes", "no", "pending"].includes(rsvpStatus)) {
      return NextResponse.json(
        { error: "rsvpStatus must be yes, no, or pending" },
        { status: 400 },
      );
    }

    const guest = await db.guest.findUnique({
      where: { id: guestId },
      select: { id: true, firstName: true },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    await db.guest.update({
      where: { id: guestId },
      data: { rsvpStatus },
    });

    return NextResponse.json({ success: true, rsvpStatus });
  } catch (error) {
    console.error("Error in POST /api/admin/guests/[id]/set-rsvp:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
