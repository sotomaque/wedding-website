import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Typeahead search over primary guests, used by the "merge into another guest"
 * picker. Matches first/last name or invite code; excludes plus-ones and an
 * optional guest id (the merge source).
 *
 * @description Search guests for the merge picker
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function GET(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const exclude = request.nextUrl.searchParams.get("exclude") ?? undefined;
    if (q.length < 2) {
      return NextResponse.json({ guests: [] });
    }

    const where: Prisma.GuestWhereInput = {
      weddingId,
      isPlusOne: false,
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { inviteCode: { contains: q, mode: "insensitive" } },
      ],
    };
    if (exclude) where.id = { not: exclude };

    const guests = await db.guest.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        inviteCode: true,
        selfRegistered: true,
      },
      orderBy: { firstName: "asc" },
      take: 10,
    });

    return NextResponse.json({ guests });
  } catch (error) {
    console.error("Error in GET /api/admin/guests/search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
