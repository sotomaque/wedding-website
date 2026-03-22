"use server";

import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

interface Gift {
  id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_link_id: string | null;
  stripe_charge_id: string | null;
  donor_email: string | null;
  donor_name: string | null;
  amount_cents: number;
  currency: string;
  gift_type: "baby_fund" | "honeymoon" | "student_loans" | null;
  guest_id: string | null;
  status: "pending" | "completed" | "refunded" | "failed";
  thank_you_email_sent: boolean;
  thank_you_email_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined guest data
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_email?: string | null;
}

interface GetGiftsParams {
  giftType?: "baby_fund" | "honeymoon" | "student_loans";
  status?: "pending" | "completed" | "refunded" | "failed";
  thankYouSent?: "true" | "false";
  hasGuest?: "true" | "false";
  sortBy?:
    | "created_at"
    | "amount_cents"
    | "donor_name"
    | "gift_type"
    | "status";
  sortOrder?: "asc" | "desc";
}

export async function getGifts(params: GetGiftsParams = {}): Promise<Gift[]> {
  try {
    const weddingId = await getWeddingId();

    let query = db
      .selectFrom("gifts")
      .leftJoin("guests", "gifts.guest_id", "guests.id")
      .where("gifts.wedding_id", "=", weddingId)
      .select([
        "gifts.id",
        "gifts.stripe_checkout_session_id",
        "gifts.stripe_payment_intent_id",
        "gifts.stripe_payment_link_id",
        "gifts.stripe_charge_id",
        "gifts.donor_email",
        "gifts.donor_name",
        "gifts.amount_cents",
        "gifts.currency",
        "gifts.gift_type",
        "gifts.guest_id",
        "gifts.status",
        "gifts.thank_you_email_sent",
        "gifts.thank_you_email_sent_at",
        "gifts.notes",
        "gifts.created_at",
        "gifts.updated_at",
        "guests.first_name as guest_first_name",
        "guests.last_name as guest_last_name",
        "guests.email as guest_email",
      ]);

    // Apply filters
    if (params.giftType) {
      query = query.where("gifts.gift_type", "=", params.giftType);
    }

    if (params.status) {
      query = query.where("gifts.status", "=", params.status);
    }

    if (params.thankYouSent !== undefined) {
      query = query.where(
        "gifts.thank_you_email_sent",
        "=",
        params.thankYouSent === "true",
      );
    }

    if (params.hasGuest !== undefined) {
      if (params.hasGuest === "true") {
        query = query.where("gifts.guest_id", "is not", null);
      } else {
        query = query.where("gifts.guest_id", "is", null);
      }
    }

    // Apply sorting
    const sortBy = params.sortBy || "created_at";
    const sortOrder = params.sortOrder || "desc";

    // Map sortBy to actual column with table prefix
    const sortColumn =
      sortBy === "created_at"
        ? "gifts.created_at"
        : sortBy === "amount_cents"
          ? "gifts.amount_cents"
          : sortBy === "donor_name"
            ? "gifts.donor_name"
            : sortBy === "gift_type"
              ? "gifts.gift_type"
              : sortBy === "status"
                ? "gifts.status"
                : "gifts.created_at";

    query = query.orderBy(sortColumn, sortOrder);

    const gifts = await query.execute();

    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return gifts as any;
  } catch (error) {
    console.error("Error fetching gifts:", error);
    throw error;
  }
}

export async function getGiftWithGuest(giftId: string) {
  try {
    const weddingId = await getWeddingId();

    const gift = await db
      .selectFrom("gifts")
      .leftJoin("guests", "gifts.guest_id", "guests.id")
      .where("gifts.wedding_id", "=", weddingId)
      .select([
        "gifts.id",
        "gifts.stripe_checkout_session_id",
        "gifts.stripe_payment_intent_id",
        "gifts.stripe_payment_link_id",
        "gifts.stripe_charge_id",
        "gifts.donor_email",
        "gifts.donor_name",
        "gifts.amount_cents",
        "gifts.currency",
        "gifts.gift_type",
        "gifts.guest_id",
        "gifts.status",
        "gifts.thank_you_email_sent",
        "gifts.thank_you_email_sent_at",
        "gifts.notes",
        "gifts.created_at",
        "gifts.updated_at",
        "guests.first_name as guest_first_name",
        "guests.last_name as guest_last_name",
        "guests.email as guest_email",
      ])
      .where("gifts.id", "=", giftId)
      .executeTakeFirst();

    if (!gift) {
      return null;
    }

    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return gift as any as Gift;
  } catch (error) {
    console.error("Error fetching gift:", error);
    return null;
  }
}

interface GuestOption {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
}

export async function getGuestOptions(): Promise<GuestOption[]> {
  try {
    const weddingId = await getWeddingId();

    const guests = await db
      .selectFrom("guests")
      .where("wedding_id", "=", weddingId)
      .select(["id", "first_name", "last_name", "email"])
      .where("is_plus_one", "=", false)
      .orderBy("first_name", "asc")
      .orderBy("last_name", "asc")
      .execute();

    return guests;
  } catch (error) {
    console.error("Error fetching guest options:", error);
    return [];
  }
}

export async function getGiftStats() {
  try {
    const weddingId = await getWeddingId();

    const gifts = await db
      .selectFrom("gifts")
      .where("wedding_id", "=", weddingId)
      .select([
        "gift_type",
        "status",
        db.fn.sum<number>("amount_cents").as("total_cents"),
        db.fn.count<number>("id").as("count"),
      ])
      .where("status", "=", "completed")
      .groupBy(["gift_type", "status"])
      .execute();

    const stats = {
      baby_fund: { total: 0, count: 0 },
      honeymoon: { total: 0, count: 0 },
      student_loans: { total: 0, count: 0 },
      unknown: { total: 0, count: 0 },
      grand_total: 0,
      total_count: 0,
    };

    for (const gift of gifts) {
      const type = gift.gift_type || "unknown";
      const key = type as keyof typeof stats;
      if (key in stats && typeof stats[key] === "object") {
        const statEntry = stats[key] as { total: number; count: number };
        statEntry.total = Number(gift.total_cents) || 0;
        statEntry.count = Number(gift.count) || 0;
        stats.grand_total += statEntry.total;
        stats.total_count += statEntry.count;
      }
    }

    return stats;
  } catch (error) {
    console.error("Error fetching gift stats:", error);
    throw error;
  }
}
