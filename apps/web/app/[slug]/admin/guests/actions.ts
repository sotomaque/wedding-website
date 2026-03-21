"use server";

import { db } from "@/lib/db";
import type { Database } from "@/lib/supabase/types";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

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

export async function getGuests(
  params: GetGuestsParams = {},
): Promise<Guest[]> {
  try {
    let query = db.selectFrom("guests").selectAll();

    // Apply filters
    if (params.side) {
      query = query.where("side", "=", params.side);
    }

    if (params.rsvpStatus) {
      query = query.where("rsvp_status", "=", params.rsvpStatus);
    }

    if (params.list) {
      query = query.where("list", "=", params.list as "a" | "b");
    }

    if (params.family !== undefined) {
      query = query.where("family", "=", params.family === "true");
    }

    if (params.isPlusOne !== undefined) {
      query = query.where("is_plus_one", "=", params.isPlusOne === "true");
    }

    if (params.emailStatus) {
      if (params.emailStatus === "not_sent") {
        query = query.where("number_of_resends", "=", 0);
      } else if (params.emailStatus === "sent") {
        query = query.where("number_of_resends", "=", 1);
      } else if (params.emailStatus === "resent") {
        query = query.where("number_of_resends", ">", 1);
      }
    }

    if (params.under21 !== undefined) {
      query = query.where("under_21", "=", params.under21 === "true");
    }

    if (params.threeAndUnder !== undefined) {
      query = query.where(
        "three_and_under",
        "=",
        params.threeAndUnder === "true",
      );
    }

    if (params.bridalParty) {
      if (params.bridalParty === "any") {
        query = query.where("bridal_party_role", "is not", null);
      } else {
        query = query.where("bridal_party_role", "=", params.bridalParty);
      }
    }

    // Apply sorting
    const sortBy = params.sortBy || "created_at";
    const sortOrder = params.sortOrder || "desc";
    query = query.orderBy(sortBy, sortOrder);

    const guests = await query.execute();
    // Kysely returns Date objects which get serialized to strings when sent to client
    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return guests as any;
  } catch (error) {
    console.error("Error fetching guests:", error);
    throw error;
  }
}

export async function getGuestWithPlusOne(guestId: string) {
  try {
    const guest = await db
      .selectFrom("guests")
      .selectAll()
      .where("id", "=", guestId)
      .executeTakeFirst();

    if (!guest) {
      return { guest: null, plusOne: null };
    }

    // Fetch plus-one if exists
    const plusOne = await db
      .selectFrom("guests")
      .selectAll()
      .where("primary_guest_id", "=", guestId)
      .where("is_plus_one", "=", true)
      .executeTakeFirst();

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
    const parties = await db
      .selectFrom("parties")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

    // Fetch guest counts and names for each party
    const partiesWithInfo = await Promise.all(
      parties.map(async (party) => {
        const guests = await db
          .selectFrom("guests")
          .select(["first_name", "last_name"])
          .where("party_id", "=", party.id)
          .orderBy("is_plus_one", "asc")
          .execute();

        const guestNames = guests
          .slice(0, 3)
          .map((g) => g.first_name)
          .join(", ");

        return {
          id: party.id,
          invite_code: party.invite_code,
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
