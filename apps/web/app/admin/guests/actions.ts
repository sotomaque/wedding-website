"use server";

import { db } from "@/lib/db";

interface GetGuestsParams {
  side?: "bride" | "groom";
  rsvpStatus?: "pending" | "yes" | "no";
  list?: "a" | "b" | "c";
  family?: "true" | "false";
  isPlusOne?: "true" | "false";
  emailStatus?: "not_sent" | "sent" | "resent";
  under21?: "true" | "false";
  threeAndUnder?: "true" | "false";
  bridalParty?:
    | "groomsman"
    | "best_man"
    | "bridesmaid"
    | "maid_of_honor"
    | "any";
  sortBy?:
    | "first_name"
    | "email"
    | "side"
    | "list"
    | "rsvp_status"
    | "number_of_resends"
    | "created_at";
  sortOrder?: "asc" | "desc";
}

const sortByMap: Record<string, string> = {
  first_name: "firstName",
  email: "email",
  side: "side",
  list: "list",
  rsvp_status: "rsvpStatus",
  number_of_resends: "numberOfResends",
  created_at: "createdAt",
};

export async function getGuests(params: GetGuestsParams = {}) {
  try {
    // Build where clause
    // biome-ignore lint/suspicious/noExplicitAny: dynamic filter building
    const where: any = {};

    if (params.side) {
      where.side = params.side;
    }

    if (params.rsvpStatus) {
      where.rsvpStatus = params.rsvpStatus;
    }

    if (params.list) {
      where.list = params.list;
    }

    if (params.family !== undefined) {
      where.family = params.family === "true";
    }

    if (params.isPlusOne !== undefined) {
      where.isPlusOne = params.isPlusOne === "true";
    }

    if (params.emailStatus) {
      if (params.emailStatus === "not_sent") {
        where.numberOfResends = 0;
      } else if (params.emailStatus === "sent") {
        where.numberOfResends = 1;
      } else if (params.emailStatus === "resent") {
        where.numberOfResends = { gt: 1 };
      }
    }

    if (params.under21 !== undefined) {
      where.under21 = params.under21 === "true";
    }

    if (params.threeAndUnder !== undefined) {
      where.threeAndUnder = params.threeAndUnder === "true";
    }

    if (params.bridalParty) {
      if (params.bridalParty === "any") {
        where.bridalPartyRole = { not: null };
      } else {
        where.bridalPartyRole = params.bridalParty;
      }
    }

    // Apply sorting
    const sortBy = sortByMap[params.sortBy || "created_at"] || "createdAt";
    const sortOrder = params.sortOrder || "desc";

    const guests = await db.guest.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
    });

    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return guests as any;
  } catch (error) {
    console.error("Error fetching guests:", error);
    throw error;
  }
}

export async function getGuestWithPlusOne(guestId: string) {
  try {
    const guest = await db.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      return { guest: null, plusOne: null };
    }

    // Fetch plus-one if exists
    const plusOne = await db.guest.findFirst({
      where: {
        primaryGuestId: guestId,
        isPlusOne: true,
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return { guest: guest as any, plusOne: (plusOne || null) as any };
  } catch (error) {
    console.error("Error fetching guest with plus-one:", error);
    return { guest: null, plusOne: null };
  }
}

export interface PartyOption {
  id: string;
  invite_code: string;
  name: string | null;
  guestNames: string;
  guestCount: number;
}

/**
 * Get all parties with guest info for dropdown selection
 */
export async function getPartiesForSelect(): Promise<PartyOption[]> {
  try {
    const parties = await db.party.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Fetch guest counts and names for each party
    const partiesWithInfo = await Promise.all(
      parties.map(async (party) => {
        const guests = await db.guest.findMany({
          where: { partyId: party.id },
          select: { firstName: true, lastName: true },
          orderBy: { isPlusOne: "asc" },
        });

        const guestNames = guests
          .slice(0, 3)
          .map((g) => g.firstName)
          .join(", ");

        return {
          id: party.id,
          invite_code: party.inviteCode,
          name: party.name,
          guestNames:
            guests.length > 3
              ? `${guestNames} +${guests.length - 3}`
              : guestNames,
          guestCount: guests.length,
        };
      }),
    );

    return partiesWithInfo;
  } catch (error) {
    console.error("Error fetching parties for select:", error);
    return [];
  }
}
