"use server";

import { db } from "@/lib/db";
import {
  buildGuestListWhere,
  type GuestListFilterParams,
} from "@/lib/db/admin/guest-list-where";
import { getWeddingId } from "@/lib/db/wedding-context";

interface GetGuestsParams extends GuestListFilterParams {
  sortBy?:
    | "firstName"
    | "email"
    | "side"
    | "list"
    | "rsvpStatus"
    | "numberOfResends"
    | "createdAt";
  sortOrder?: "asc" | "desc";
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
    const where = buildGuestListWhere(weddingId, params);

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
