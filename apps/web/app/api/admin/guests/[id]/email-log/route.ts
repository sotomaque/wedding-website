import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Communication history for a single guest — every email we've recorded
 * sending to them, newest first.
 *
 * @description List the email communication log for a guest
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id: guestId } = await params;

    const logs = await db.emailLog.findMany({
      where: { guestId, weddingId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        subject: true,
        status: true,
        recipientEmail: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error in GET /api/admin/guests/[id]/email-log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
