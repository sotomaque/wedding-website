"use server";

import { db } from "@/lib/db";

interface Gift {
  id: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripePaymentLinkId: string | null;
  stripeChargeId: string | null;
  donorEmail: string | null;
  donorName: string | null;
  amountCents: number;
  currency: string;
  giftType: "baby_fund" | "honeymoon" | "student_loans" | null;
  guestId: string | null;
  status: "pending" | "completed" | "refunded" | "failed";
  thankYouEmailSent: boolean;
  thankYouEmailSentAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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

const sortByMap: Record<string, string> = {
  created_at: "createdAt",
  amount_cents: "amountCents",
  donor_name: "donorName",
  gift_type: "giftType",
  status: "status",
};

export async function getGifts(params: GetGiftsParams = {}): Promise<Gift[]> {
  try {
    // Build where clause
    // biome-ignore lint/suspicious/noExplicitAny: dynamic filter building
    const where: any = {};

    if (params.giftType) {
      where.giftType = params.giftType;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.thankYouSent !== undefined) {
      where.thankYouEmailSent = params.thankYouSent === "true";
    }

    if (params.hasGuest !== undefined) {
      if (params.hasGuest === "true") {
        where.guestId = { not: null };
      } else {
        where.guestId = null;
      }
    }

    // Apply sorting
    const sortBy = sortByMap[params.sortBy || "created_at"] || "createdAt";
    const sortOrder = params.sortOrder || "desc";

    const gifts = await db.gift.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Map to expected shape with flattened guest data
    const mapped = gifts.map((gift) => ({
      ...gift,
      guest_first_name: gift.guest?.firstName ?? null,
      guest_last_name: gift.guest?.lastName ?? null,
      guest_email: gift.guest?.email ?? null,
      guest: undefined,
    }));

    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return mapped as any;
  } catch (error) {
    console.error("Error fetching gifts:", error);
    throw error;
  }
}

export async function getGiftWithGuest(giftId: string) {
  try {
    const gift = await db.gift.findUnique({
      where: { id: giftId },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!gift) {
      return null;
    }

    // Map to expected shape with flattened guest data
    const mapped = {
      ...gift,
      guest_first_name: gift.guest?.firstName ?? null,
      guest_last_name: gift.guest?.lastName ?? null,
      guest_email: gift.guest?.email ?? null,
      guest: undefined,
    };

    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return mapped as any as Gift;
  } catch (error) {
    console.error("Error fetching gift:", error);
    return null;
  }
}

interface GuestOption {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

export async function getGuestOptions(): Promise<GuestOption[]> {
  try {
    const guests = await db.guest.findMany({
      where: { isPlusOne: false },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return guests;
  } catch (error) {
    console.error("Error fetching guest options:", error);
    return [];
  }
}

export async function getGiftStats() {
  try {
    const gifts = await db.gift.groupBy({
      by: ["giftType", "status"],
      where: { status: "completed" },
      _sum: { amountCents: true },
      _count: { id: true },
    });

    const stats = {
      baby_fund: { total: 0, count: 0 },
      honeymoon: { total: 0, count: 0 },
      student_loans: { total: 0, count: 0 },
      unknown: { total: 0, count: 0 },
      grand_total: 0,
      total_count: 0,
    };

    for (const gift of gifts) {
      const type = gift.giftType || "unknown";
      const key = type as keyof typeof stats;
      if (key in stats && typeof stats[key] === "object") {
        const statEntry = stats[key] as { total: number; count: number };
        statEntry.total = gift._sum.amountCents || 0;
        statEntry.count = gift._count.id || 0;
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
