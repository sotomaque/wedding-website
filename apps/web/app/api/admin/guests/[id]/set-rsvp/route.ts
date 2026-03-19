import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

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

    const { id: guestId } = await params;
    const body = await request.json();
    const { rsvpStatus } = body;

    if (!["yes", "no", "pending"].includes(rsvpStatus)) {
      return NextResponse.json(
        { error: "rsvpStatus must be yes, no, or pending" },
        { status: 400 },
      );
    }

    const guest = await db
      .selectFrom("guests")
      .select(["id", "first_name"])
      .where("id", "=", guestId)
      .executeTakeFirst();

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    await db
      .updateTable("guests")
      .set({ rsvp_status: rsvpStatus })
      .where("id", "=", guestId)
      .execute();

    return NextResponse.json({ success: true, rsvpStatus });
  } catch (error) {
    console.error("Error in POST /api/admin/guests/[id]/set-rsvp:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
