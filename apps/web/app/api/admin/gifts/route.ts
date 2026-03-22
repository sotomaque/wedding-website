import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * List all gifts
 * @description Get all gifts with guest info and totals (admin only)
 * @response 200:GiftListResponse
 * @auth bearer
 * @tag Admin - Gifts
 * @openapi
 */
export async function GET() {
  try {
    const { authorized, error } = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: error === "Unauthorized" ? 401 : 403 },
      );
    }

    const weddingId = await getWeddingId();

    // Get all gifts with guest information via include relation
    const gifts = await db.gift.findMany({
      where: { weddingId },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            inviteCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Flatten guest info onto each gift for backwards compatibility
    const giftsWithGuest = gifts.map((gift) => ({
      ...gift,
      guestFirstName: gift.guest?.firstName ?? null,
      guestLastName: gift.guest?.lastName ?? null,
      guestInviteCode: gift.guest?.inviteCode ?? null,
    }));

    // Calculate totals
    const totals = {
      total_amount_cents: 0,
      by_type: {
        baby_fund: 0,
        honeymoon: 0,
        student_loans: 0,
        unknown: 0,
      },
      count: gifts.length,
      matched_to_guests: 0,
    };

    for (const gift of gifts) {
      if (gift.status === "completed") {
        totals.total_amount_cents += gift.amountCents;

        if (gift.giftType === "baby_fund") {
          totals.by_type.baby_fund += gift.amountCents;
        } else if (gift.giftType === "honeymoon") {
          totals.by_type.honeymoon += gift.amountCents;
        } else if (gift.giftType === "student_loans") {
          totals.by_type.student_loans += gift.amountCents;
        } else {
          totals.by_type.unknown += gift.amountCents;
        }

        if (gift.guestId) {
          totals.matched_to_guests++;
        }
      }
    }

    return NextResponse.json({ gifts: giftsWithGuest, totals });
  } catch (error) {
    console.error("Error in GET /api/admin/gifts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Update a gift
 * @description Update a gift record, e.g. mark thank-you email sent or link to guest (admin only)
 * @body UpdateGiftBody
 * @response 200:UpdateGiftResponse
 * @auth bearer
 * @tag Admin - Gifts
 * @openapi
 */
export async function PATCH(request: NextRequest) {
  try {
    const { authorized, error } = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: error === "Unauthorized" ? 401 : 403 },
      );
    }

    const body = await request.json();
    const { id, thankYouEmailSent, guestId, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Gift ID is required" },
        { status: 400 },
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (thankYouEmailSent !== undefined) {
      updates.thankYouEmailSent = thankYouEmailSent;
      if (thankYouEmailSent) {
        updates.thankYouEmailSentAt = new Date().toISOString();
      }
    }

    if (guestId !== undefined) {
      updates.guestId = guestId;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    // Check if gift exists first
    const existing = await db.gift.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    const updatedGift = await db.gift.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ gift: updatedGift });
  } catch (error) {
    console.error("Error in PATCH /api/admin/gifts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
