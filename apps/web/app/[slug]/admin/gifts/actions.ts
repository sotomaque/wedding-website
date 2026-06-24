"use server";

import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Resolve the current wedding and assert the caller is an admin for it.
 *
 * Server Actions are independently-invocable POST endpoints, so they must
 * authorize on their own — the admin layout/middleware does not protect them.
 */
async function authorizeWedding(): Promise<
  { weddingId: string } | { error: string }
> {
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized) return { error: auth.error ?? "Unauthorized" };
  return { weddingId };
}

// Prisma returns Date objects for timestamp columns; serialize them to the
// ISO strings the client table consumes. Tolerant of values that are already
// strings (e.g. in tests) and of null.
function dateToString(value: Date | string | null | undefined): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : String(value);
}

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
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestEmail?: string | null;
}

interface GetGiftsParams {
  giftType?: "baby_fund" | "honeymoon" | "student_loans";
  status?: "pending" | "completed" | "refunded" | "failed";
  thankYouSent?: "true" | "false";
  hasGuest?: "true" | "false";
  sortBy?: "createdAt" | "amountCents" | "donorName" | "giftType" | "status";
  sortOrder?: "asc" | "desc";
}

const sortByMap: Record<string, string> = {
  createdAt: "createdAt",
  amountCents: "amountCents",
  donorName: "donorName",
  giftType: "giftType",
  status: "status",
};

export async function getGifts(params: GetGiftsParams = {}): Promise<Gift[]> {
  try {
    const authz = await authorizeWedding();
    if ("error" in authz) throw new Error(authz.error);
    const { weddingId } = authz;
    // Build where clause
    // biome-ignore lint/suspicious/noExplicitAny: dynamic filter building
    const where: any = { weddingId };

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
    const sortBy = sortByMap[params.sortBy || "createdAt"] || "createdAt";
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

    // Flatten guest data and serialize dates to the string shape the client
    // table consumes. Destructuring `guest` out drops the nested relation.
    return gifts.map(({ guest, ...gift }) => ({
      ...gift,
      createdAt: dateToString(gift.createdAt),
      updatedAt: dateToString(gift.updatedAt),
      thankYouEmailSentAt: gift.thankYouEmailSentAt
        ? dateToString(gift.thankYouEmailSentAt)
        : null,
      guestFirstName: guest?.firstName ?? null,
      guestLastName: guest?.lastName ?? null,
      guestEmail: guest?.email ?? null,
    }));
  } catch (error) {
    console.error("Error fetching gifts:", error);
    throw error;
  }
}

export async function getGiftWithGuest(giftId: string) {
  try {
    const authz = await authorizeWedding();
    if ("error" in authz) return null;
    const { weddingId } = authz;

    const gift = await db.gift.findFirst({
      where: { id: giftId, weddingId },
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

    // Flatten guest data and serialize dates to strings.
    const { guest, ...rest } = gift;
    return {
      ...rest,
      createdAt: dateToString(rest.createdAt),
      updatedAt: dateToString(rest.updatedAt),
      thankYouEmailSentAt: rest.thankYouEmailSentAt
        ? dateToString(rest.thankYouEmailSentAt)
        : null,
      guestFirstName: guest?.firstName ?? null,
      guestLastName: guest?.lastName ?? null,
      guestEmail: guest?.email ?? null,
    };
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
    const authz = await authorizeWedding();
    if ("error" in authz) return [];
    const { weddingId } = authz;
    const guests = await db.guest.findMany({
      where: { isPlusOne: false, weddingId },
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
    const authz = await authorizeWedding();
    if ("error" in authz) throw new Error(authz.error);
    const { weddingId } = authz;
    const gifts = await db.gift.groupBy({
      by: ["giftType", "status"],
      where: { status: "completed", weddingId },
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
