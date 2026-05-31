"use server";

import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

interface GetGuestsParams {
  side?: "bride" | "groom";
  rsvpStatus?: string;
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
    | "firstName"
    | "email"
    | "side"
    | "list"
    | "rsvpStatus"
    | "numberOfResends"
    | "createdAt";
  sortOrder?: "asc" | "desc";
  events?: string;
}

const sortByMap: Record<string, string> = {
  firstName: "firstName",
  email: "email",
  side: "side",
  list: "list",
  rsvpStatus: "rsvpStatus",
  numberOfResends: "numberOfResends",
  createdAt: "createdAt",
};

export async function getGuests(params: GetGuestsParams = {}) {
  try {
    const weddingId = await getWeddingId();
    // Build where clause
    // biome-ignore lint/suspicious/noExplicitAny: dynamic filter building
    const where: any = { weddingId };

    if (params.side) {
      where.side = params.side;
    }

    if (params.rsvpStatus) {
      const statuses = params.rsvpStatus.split(",").filter(Boolean);
      if (statuses.length === 1) {
        where.rsvpStatus = statuses[0];
      } else if (statuses.length > 1) {
        where.rsvpStatus = { in: statuses };
      }
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

    // Event invitation filter — guests who have a GuestEventInvite for ANY of the selected events
    if (params.events) {
      const eventIds = params.events.split(",").filter(Boolean);
      if (eventIds.length === 1) {
        where.guestEventInvites = {
          some: { eventId: eventIds[0] },
        };
      } else if (eventIds.length > 1) {
        // AND logic: guest must be invited to ALL selected events
        where.AND = eventIds.map((id: string) => ({
          guestEventInvites: { some: { eventId: id } },
        }));
      }
    }

    // Apply sorting
    const sortBy = sortByMap[params.sortBy || "createdAt"] || "createdAt";
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
    const weddingId = await getWeddingId();
    const guest = await db.guest.findFirst({
      where: { id: guestId, weddingId },
    });

    if (!guest) {
      return { guest: null, plusOne: null };
    }

    // Fetch plus-one if exists
    const plusOne = await db.guest.findFirst({
      where: {
        primaryGuestId: guestId,
        isPlusOne: true,
        weddingId,
      },
    });

    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return { guest: guest as any, plusOne: (plusOne || null) as any };
  } catch (error) {
    console.error("Error fetching guest with plus-one:", error);
    return { guest: null, plusOne: null };
  }
}

export interface EventOption {
  id: string;
  name: string;
  isDefault: boolean;
}

/**
 * Get all events for the wedding (for event invite toggles in Add Guest form)
 */
export async function getEventsForSelect(): Promise<EventOption[]> {
  try {
    const weddingId = await getWeddingId();
    const events = await db.event.findMany({
      where: { weddingId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, isDefault: true },
    });
    return events.map((e) => ({
      id: e.id,
      name: e.name,
      isDefault: e.isDefault ?? false,
    }));
  } catch (error) {
    console.error("Error fetching events for select:", error);
    return [];
  }
}

/**
 * Get event IDs a guest is currently invited to
 */
export async function getGuestEventIds(guestId: string): Promise<string[]> {
  try {
    const weddingId = await getWeddingId();
    const invites = await db.guestEventInvite.findMany({
      where: { guestId, weddingId },
      select: { eventId: true },
    });
    return invites.map((i) => i.eventId);
  } catch (error) {
    console.error("Error fetching guest event IDs:", error);
    return [];
  }
}

export interface PartyOption {
  id: string;
  inviteCode: string;
  name: string | null;
  guestNames: string;
  guestCount: number;
}

/**
 * Get all parties with guest info for dropdown selection
 */
export async function getPartiesForSelect(): Promise<PartyOption[]> {
  try {
    const weddingId = await getWeddingId();
    // Single query with the guests joined in, instead of one guest query per
    // party (previously an N+1 over Promise.all).
    const parties = await db.party.findMany({
      where: { weddingId },
      orderBy: { createdAt: "desc" },
      include: {
        guests: {
          select: { firstName: true },
          orderBy: { isPlusOne: "asc" },
        },
      },
    });

    return parties.map((party) => {
      const guestNames = party.guests
        .slice(0, 3)
        .map((g) => g.firstName)
        .join(", ");

      return {
        id: party.id,
        inviteCode: party.inviteCode,
        name: party.name,
        guestNames:
          party.guests.length > 3
            ? `${guestNames} +${party.guests.length - 3}`
            : guestNames,
        guestCount: party.guests.length,
      };
    });
  } catch (error) {
    console.error("Error fetching parties for select:", error);
    return [];
  }
}
