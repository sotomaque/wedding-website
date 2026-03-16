import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";

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

    // Get all gifts with guest information via left join
    const gifts = await db
      .selectFrom("gifts")
      .leftJoin("guests", "gifts.guest_id", "guests.id")
      .select([
        "gifts.id",
        "gifts.stripe_checkout_session_id",
        "gifts.stripe_payment_intent_id",
        "gifts.stripe_payment_link_id",
        "gifts.donor_email",
        "gifts.donor_name",
        "gifts.amount_cents",
        "gifts.currency",
        "gifts.gift_type",
        "gifts.guest_id",
        "gifts.status",
        "gifts.thank_you_email_sent",
        "gifts.thank_you_email_sent_at",
        "gifts.created_at",
        "gifts.updated_at",
        "guests.first_name as guest_first_name",
        "guests.last_name as guest_last_name",
        "guests.invite_code as guest_invite_code",
      ])
      .orderBy("gifts.created_at", "desc")
      .execute();

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
        totals.total_amount_cents += gift.amount_cents;

        if (gift.gift_type === "baby_fund") {
          totals.by_type.baby_fund += gift.amount_cents;
        } else if (gift.gift_type === "honeymoon") {
          totals.by_type.honeymoon += gift.amount_cents;
        } else if (gift.gift_type === "student_loans") {
          totals.by_type.student_loans += gift.amount_cents;
        } else {
          totals.by_type.unknown += gift.amount_cents;
        }

        if (gift.guest_id) {
          totals.matched_to_guests++;
        }
      }
    }

    return NextResponse.json({ gifts, totals });
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
    const { id, thank_you_email_sent, guest_id, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Gift ID is required" },
        { status: 400 },
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (thank_you_email_sent !== undefined) {
      updates.thank_you_email_sent = thank_you_email_sent;
      if (thank_you_email_sent) {
        updates.thank_you_email_sent_at = new Date().toISOString();
      }
    }

    if (guest_id !== undefined) {
      updates.guest_id = guest_id;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    const updatedGift = await db
      .updateTable("gifts")
      .set(updates)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedGift) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    return NextResponse.json({ gift: updatedGift });
  } catch (error) {
    console.error("Error in PATCH /api/admin/gifts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
