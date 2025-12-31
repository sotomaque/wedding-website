"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { db } from "@/lib/db";
import type { Database } from "@/lib/supabase/types";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

interface GetGuestsParams {
  side?: "bride" | "groom";
  rsvpStatus?: "pending" | "yes" | "no";
  list?: "a" | "b" | "c";
  family?: "true" | "false";
  isPlusOne?: "true" | "false";
  sortBy?:
    | "first_name"
    | "email"
    | "side"
    | "list"
    | "rsvp_status"
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
    return [];
  }
}

export async function deleteGuest(guestId: string) {
  try {
    await db.deleteFrom("guests").where("id", "=", guestId).execute();

    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error("Error deleting guest:", error);
    return { success: false, error: "Failed to delete guest" };
  }
}

export async function resendInviteEmail(guestId: string) {
  try {
    // This will call the existing API route
    const response = await fetch(
      `${env.NEXT_PUBLIC_APP_URL}/api/admin/guests/resend-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to resend email");
    }

    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error("Error resending email:", error);
    return { success: false, error: "Failed to resend email" };
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
