"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";
import type { Database } from "@/lib/supabase/types";

type Party = Database["public"]["Tables"]["parties"]["Row"];
type Guest = Database["public"]["Tables"]["guests"]["Row"];

export interface PartyWithGuests extends Party {
  guests: Guest[];
  guestCount: number;
}

interface GetPartiesParams {
  side?: "bride" | "groom" | "both";
  list?: "a" | "b" | "c";
  sortBy?: "invite_code" | "name" | "created_at";
  sortOrder?: "asc" | "desc";
}

/**
 * Get all parties with their guest counts
 */
export async function getParties(
  params: GetPartiesParams = {},
): Promise<PartyWithGuests[]> {
  try {
    let query = db.selectFrom("parties").selectAll();

    // Apply filters
    if (params.side) {
      query = query.where("side", "=", params.side);
    }

    if (params.list) {
      query = query.where("list", "=", params.list);
    }

    // Apply sorting
    const sortBy = params.sortBy || "created_at";
    const sortOrder = params.sortOrder || "desc";
    query = query.orderBy(sortBy, sortOrder);

    const parties = await query.execute();

    // Fetch guests for each party
    const partiesWithGuests = await Promise.all(
      parties.map(async (party) => {
        const guests = await db
          .selectFrom("guests")
          .selectAll()
          .where("party_id", "=", party.id)
          .orderBy("is_plus_one", "asc")
          .orderBy("first_name", "asc")
          .execute();

        return {
          ...party,
          guests: guests as unknown as Guest[],
          guestCount: guests.length,
        };
      }),
    );

    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return partiesWithGuests as any;
  } catch (error) {
    console.error("Error fetching parties:", error);
    throw error;
  }
}

/**
 * Get a single party with all its guests
 */
export async function getPartyById(
  partyId: string,
): Promise<PartyWithGuests | null> {
  try {
    const party = await db
      .selectFrom("parties")
      .selectAll()
      .where("id", "=", partyId)
      .executeTakeFirst();

    if (!party) {
      return null;
    }

    const guests = await db
      .selectFrom("guests")
      .selectAll()
      .where("party_id", "=", partyId)
      .orderBy("is_plus_one", "asc")
      .orderBy("first_name", "asc")
      .execute();

    return {
      ...party,
      guests: guests as unknown as Guest[],
      guestCount: guests.length,
      // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    } as any;
  } catch (error) {
    console.error("Error fetching party:", error);
    return null;
  }
}

/**
 * Update party details
 */
export async function updateParty(
  partyId: string,
  data: {
    name?: string | null;
    side?: "bride" | "groom" | "both" | null;
    list?: "a" | "b" | "c" | null;
    notes?: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .updateTable("parties")
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", partyId)
      .execute();

    const { slug } = await getWeddingContext();
    revalidatePath(`/${slug}/admin/parties`);
    revalidatePath(`/${slug}/admin/parties/${partyId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating party:", error);
    return { success: false, error: "Failed to update party" };
  }
}

/**
 * Move a guest to a different party
 */
export async function moveGuestToParty(
  guestId: string,
  targetPartyId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the guest's current party before moving
    const guest = await db
      .selectFrom("guests")
      .select(["party_id"])
      .where("id", "=", guestId)
      .executeTakeFirst();

    const sourcePartyId = guest?.party_id;

    // Get the target party to update the guest's invite_code as well
    const targetParty = await db
      .selectFrom("parties")
      .select(["id", "invite_code"])
      .where("id", "=", targetPartyId)
      .executeTakeFirst();

    if (!targetParty) {
      return { success: false, error: "Target party not found" };
    }

    // Update the guest
    await db
      .updateTable("guests")
      .set({
        party_id: targetPartyId,
        invite_code: targetParty.invite_code,
      })
      .where("id", "=", guestId)
      .execute();

    // Clean up the source party if it's now empty
    if (sourcePartyId && sourcePartyId !== targetPartyId) {
      await deleteEmptyParty(sourcePartyId);
    }

    const { slug } = await getWeddingContext();
    revalidatePath(`/${slug}/admin/parties`);
    revalidatePath(`/${slug}/admin/guests`);
    return { success: true };
  } catch (error) {
    console.error("Error moving guest to party:", error);
    return { success: false, error: "Failed to move guest" };
  }
}

/**
 * Merge two parties - moves all guests from source to target, then deletes source
 */
export async function mergeParties(
  sourcePartyId: string,
  targetPartyId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the target party
    const targetParty = await db
      .selectFrom("parties")
      .select(["id", "invite_code"])
      .where("id", "=", targetPartyId)
      .executeTakeFirst();

    if (!targetParty) {
      return { success: false, error: "Target party not found" };
    }

    // Move all guests from source to target
    await db
      .updateTable("guests")
      .set({
        party_id: targetPartyId,
        invite_code: targetParty.invite_code,
      })
      .where("party_id", "=", sourcePartyId)
      .execute();

    // Delete the source party
    await db.deleteFrom("parties").where("id", "=", sourcePartyId).execute();

    const { slug } = await getWeddingContext();
    revalidatePath(`/${slug}/admin/parties`);
    revalidatePath(`/${slug}/admin/guests`);
    return { success: true };
  } catch (error) {
    console.error("Error merging parties:", error);
    return { success: false, error: "Failed to merge parties" };
  }
}

/**
 * Create a new party from selected guests (splits them from their current party)
 */
export async function createPartyFromGuests(
  guestIds: string[],
  partyName?: string,
): Promise<{ success: boolean; partyId?: string; error?: string }> {
  try {
    if (guestIds.length === 0) {
      return { success: false, error: "No guests selected" };
    }

    // Get the first guest to use their data for the new party, and track source parties
    const guests = await db
      .selectFrom("guests")
      .select(["id", "party_id", "side", "list"])
      .where("id", "in", guestIds)
      .execute();

    const firstGuest = guests[0];
    if (!firstGuest) {
      return { success: false, error: "Guest not found" };
    }
    // Collect unique source party IDs for cleanup
    const sourcePartyIds = [
      ...new Set(guests.map((g) => g.party_id).filter(Boolean)),
    ] as string[];

    // Generate a new invite code
    const newInviteCode = generateInviteCode();

    // Create the new party
    const newParty = await db
      .insertInto("parties")
      .values({
        invite_code: newInviteCode,
        name: partyName || null,
        side: firstGuest.side,
        list: firstGuest.list,
      })
      .returning(["id"])
      .executeTakeFirst();

    if (!newParty) {
      return { success: false, error: "Failed to create party" };
    }

    // Move all selected guests to the new party
    await db
      .updateTable("guests")
      .set({
        party_id: newParty.id,
        invite_code: newInviteCode,
      })
      .where("id", "in", guestIds)
      .execute();

    // Clean up any source parties that are now empty
    for (const sourcePartyId of sourcePartyIds) {
      if (sourcePartyId !== newParty.id) {
        await deleteEmptyParty(sourcePartyId);
      }
    }

    const { slug } = await getWeddingContext();
    revalidatePath(`/${slug}/admin/parties`);
    revalidatePath(`/${slug}/admin/guests`);
    return { success: true, partyId: newParty.id };
  } catch (error) {
    console.error("Error creating party from guests:", error);
    return { success: false, error: "Failed to create party" };
  }
}

/**
 * Delete an empty party
 */
export async function deleteParty(
  partyId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if party has any guests
    const guestCount = await db
      .selectFrom("guests")
      .select(db.fn.count("id").as("count"))
      .where("party_id", "=", partyId)
      .executeTakeFirst();

    if (guestCount && Number(guestCount.count) > 0) {
      return {
        success: false,
        error:
          "Cannot delete a party that has guests. Move or remove guests first.",
      };
    }

    await db.deleteFrom("parties").where("id", "=", partyId).execute();

    const { slug } = await getWeddingContext();
    revalidatePath(`/${slug}/admin/parties`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting party:", error);
    return { success: false, error: "Failed to delete party" };
  }
}

/**
 * Bulk delete empty parties
 */
export async function bulkDeleteParties(partyIds: string[]): Promise<{
  success: boolean;
  deletedCount: number;
  skippedCount: number;
  error?: string;
}> {
  try {
    let deletedCount = 0;
    let skippedCount = 0;

    for (const partyId of partyIds) {
      const result = await deleteParty(partyId);
      if (result.success) {
        deletedCount++;
      } else {
        skippedCount++;
      }
    }

    const { slug } = await getWeddingContext();
    revalidatePath(`/${slug}/admin/parties`);
    return { success: true, deletedCount, skippedCount };
  } catch (error) {
    console.error("Error bulk deleting parties:", error);
    return {
      success: false,
      deletedCount: 0,
      skippedCount: 0,
      error: "Failed to delete parties",
    };
  }
}

/**
 * Bulk merge parties — moves all guests from source parties into target, deletes sources
 */
export async function bulkMergeParties(
  sourcePartyIds: string[],
  targetPartyId: string,
): Promise<{ success: boolean; mergedCount: number; error?: string }> {
  try {
    let mergedCount = 0;

    for (const sourceId of sourcePartyIds) {
      if (sourceId === targetPartyId) continue;
      const result = await mergeParties(sourceId, targetPartyId);
      if (result.success) mergedCount++;
    }

    const { slug } = await getWeddingContext();
    revalidatePath(`/${slug}/admin/parties`);
    revalidatePath(`/${slug}/admin/guests`);
    return { success: true, mergedCount };
  } catch (error) {
    console.error("Error bulk merging parties:", error);
    return { success: false, mergedCount: 0, error: "Failed to merge parties" };
  }
}

/**
 * Generate a unique invite code
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Helper function to delete a party if it has no guests remaining
 */
async function deleteEmptyParty(partyId: string): Promise<void> {
  try {
    const guestCount = await db
      .selectFrom("guests")
      .select(db.fn.count("id").as("count"))
      .where("party_id", "=", partyId)
      .executeTakeFirst();

    if (guestCount && Number(guestCount.count) === 0) {
      await db.deleteFrom("parties").where("id", "=", partyId).execute();
    }
  } catch (error) {
    // Log but don't fail the main operation
    console.error("Error cleaning up empty party:", error);
  }
}

/**
 * Get parties summary stats
 */
export async function getPartiesStats(): Promise<{
  totalParties: number;
  totalGuests: number;
  avgGuestsPerParty: number;
  partiesBySize: { size: number; count: number }[];
}> {
  try {
    const parties = await getParties();

    const totalParties = parties.length;
    const totalGuests = parties.reduce((sum, p) => sum + p.guestCount, 0);
    const avgGuestsPerParty =
      totalParties > 0 ? Math.round((totalGuests / totalParties) * 10) / 10 : 0;

    // Group by size
    const sizeMap = new Map<number, number>();
    for (const party of parties) {
      const count = sizeMap.get(party.guestCount) || 0;
      sizeMap.set(party.guestCount, count + 1);
    }

    const partiesBySize = Array.from(sizeMap.entries())
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => a.size - b.size);

    return {
      totalParties,
      totalGuests,
      avgGuestsPerParty,
      partiesBySize,
    };
  } catch (error) {
    console.error("Error getting party stats:", error);
    return {
      totalParties: 0,
      totalGuests: 0,
      avgGuestsPerParty: 0,
      partiesBySize: [],
    };
  }
}
