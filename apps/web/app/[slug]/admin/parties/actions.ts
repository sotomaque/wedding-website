"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { generateInviteCode } from "@/lib/utils/invite-code";

// Infer types from Prisma client without importing @prisma/client directly
type PartyModel = Awaited<ReturnType<typeof db.party.findFirstOrThrow>>;
type GuestModel = Awaited<ReturnType<typeof db.guest.findFirstOrThrow>>;

export interface PartyWithGuests extends PartyModel {
  guests: GuestModel[];
  guestCount: number;
}

interface GetPartiesParams {
  side?: "bride" | "groom" | "both";
  list?: "a" | "b" | "c";
  sortBy?: "invite_code" | "name" | "created_at";
  sortOrder?: "asc" | "desc";
}

const sortByMap: Record<string, string> = {
  invite_code: "inviteCode",
  name: "name",
  created_at: "createdAt",
};

/**
 * Resolve the current wedding and assert the caller is an admin for it.
 *
 * Server Actions are independently-invocable POST endpoints dispatched by
 * action id, so each one must authorize on its own — the admin layout and the
 * `auth.protect()` middleware do NOT reliably protect them. Every action below
 * also scopes its query by `weddingId` so a valid admin of one wedding can't
 * reach another wedding's rows by id (IDOR).
 */
async function authorizeWedding(): Promise<
  { weddingId: string } | { error: string }
> {
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized) return { error: auth.error ?? "Unauthorized" };
  return { weddingId };
}

/**
 * Get all parties with their guest counts
 */
export async function getParties(
  params: GetPartiesParams = {},
): Promise<PartyWithGuests[]> {
  try {
    const authz = await authorizeWedding();
    if ("error" in authz) throw new Error(authz.error);
    const { weddingId } = authz;
    // Build where clause
    // biome-ignore lint/suspicious/noExplicitAny: dynamic filter building
    const where: any = { weddingId };

    if (params.side) {
      where.side = params.side;
    }

    if (params.list) {
      where.list = params.list;
    }

    // Apply sorting
    const sortBy = sortByMap[params.sortBy || "created_at"] || "createdAt";
    const sortOrder = params.sortOrder || "desc";

    const parties = await db.party.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        guests: {
          orderBy: [{ isPlusOne: "asc" }, { firstName: "asc" }],
        },
      },
    });

    const partiesWithGuests = parties.map((party) => ({
      ...party,
      guestCount: party.guests.length,
    }));

    return partiesWithGuests;
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
    const authz = await authorizeWedding();
    if ("error" in authz) return null;
    const { weddingId } = authz;

    const party = await db.party.findFirst({
      where: { id: partyId, weddingId },
      include: {
        guests: {
          orderBy: [{ isPlusOne: "asc" }, { firstName: "asc" }],
        },
      },
    });

    if (!party) {
      return null;
    }

    return {
      ...party,
      guestCount: party.guests.length,
    };
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
  const authz = await authorizeWedding();
  if ("error" in authz) return { success: false, error: authz.error };
  const { weddingId } = authz;

  try {
    const result = await db.party.updateMany({
      where: { id: partyId, weddingId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return { success: false, error: "Party not found" };
    }

    revalidatePath("/admin/parties");
    revalidatePath(`/admin/parties/${partyId}`);
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
  const authz = await authorizeWedding();
  if ("error" in authz) return { success: false, error: authz.error };
  const { weddingId } = authz;

  try {
    // Get the guest's current party before moving (scoped to this wedding)
    const guest = await db.guest.findFirst({
      where: { id: guestId, weddingId },
      select: { partyId: true },
    });

    if (!guest) {
      return { success: false, error: "Guest not found" };
    }

    const sourcePartyId = guest.partyId;

    // Get the target party (scoped) to update the guest's inviteCode as well
    const targetParty = await db.party.findFirst({
      where: { id: targetPartyId, weddingId },
      select: { id: true, inviteCode: true },
    });

    if (!targetParty) {
      return { success: false, error: "Target party not found" };
    }

    // Update the guest (ownership already verified above)
    await db.guest.update({
      where: { id: guestId },
      data: {
        partyId: targetPartyId,
        inviteCode: targetParty.inviteCode,
      },
    });

    // Clean up the source party if it's now empty
    if (sourcePartyId && sourcePartyId !== targetPartyId) {
      await deleteEmptyParty(sourcePartyId, weddingId);
    }

    revalidatePath("/admin/parties");
    revalidatePath("/admin/guests");
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
  const authz = await authorizeWedding();
  if ("error" in authz) return { success: false, error: authz.error };
  const { weddingId } = authz;

  try {
    // Get the target party (scoped to this wedding)
    const targetParty = await db.party.findFirst({
      where: { id: targetPartyId, weddingId },
      select: { id: true, inviteCode: true },
    });

    if (!targetParty) {
      return { success: false, error: "Target party not found" };
    }

    // Verify the source party belongs to this wedding before touching it
    const sourceParty = await db.party.findFirst({
      where: { id: sourcePartyId, weddingId },
      select: { id: true },
    });

    if (!sourceParty) {
      return { success: false, error: "Source party not found" };
    }

    // Move all guests from source to target
    await db.guest.updateMany({
      where: { partyId: sourcePartyId, weddingId },
      data: {
        partyId: targetPartyId,
        inviteCode: targetParty.inviteCode,
      },
    });

    // Delete the source party (ownership verified above)
    await db.party.delete({
      where: { id: sourcePartyId },
    });

    revalidatePath("/admin/parties");
    revalidatePath("/admin/guests");
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
  const authz = await authorizeWedding();
  if ("error" in authz) return { success: false, error: authz.error };
  const { weddingId } = authz;

  try {
    if (guestIds.length === 0) {
      return { success: false, error: "No guests selected" };
    }

    // Get the first guest to use their data for the new party, and track source
    // parties. Scoped to this wedding so foreign guest ids are ignored.
    const guests = await db.guest.findMany({
      where: { id: { in: guestIds }, weddingId },
      select: { id: true, partyId: true, side: true, list: true },
    });

    const firstGuest = guests[0];
    if (!firstGuest) {
      return { success: false, error: "Guest not found" };
    }
    // Only operate on guests that actually belong to this wedding
    const validGuestIds = guests.map((g) => g.id);
    // Collect unique source party IDs for cleanup
    const sourcePartyIds = [
      ...new Set(guests.map((g) => g.partyId).filter(Boolean)),
    ] as string[];

    // Generate a new invite code
    const newInviteCode = generateInviteCode();

    // Create the new party
    const newParty = await db.party.create({
      data: {
        inviteCode: newInviteCode,
        name: partyName || null,
        side: firstGuest.side ?? undefined,
        list: firstGuest.list ?? undefined,
        weddingId,
      },
      select: { id: true },
    });

    // Move all selected guests to the new party
    await db.guest.updateMany({
      where: { id: { in: validGuestIds }, weddingId },
      data: {
        partyId: newParty.id,
        inviteCode: newInviteCode,
      },
    });

    // Clean up any source parties that are now empty
    for (const sourcePartyId of sourcePartyIds) {
      if (sourcePartyId !== newParty.id) {
        await deleteEmptyParty(sourcePartyId, weddingId);
      }
    }

    revalidatePath("/admin/parties");
    revalidatePath("/admin/guests");
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
  const authz = await authorizeWedding();
  if ("error" in authz) return { success: false, error: authz.error };
  const { weddingId } = authz;

  try {
    // Check if party has any guests
    const guestCount = await db.guest.count({
      where: { partyId, weddingId },
    });

    if (guestCount > 0) {
      return {
        success: false,
        error:
          "Cannot delete a party that has guests. Move or remove guests first.",
      };
    }

    const result = await db.party.deleteMany({
      where: { id: partyId, weddingId },
    });

    if (result.count === 0) {
      return { success: false, error: "Party not found" };
    }

    revalidatePath("/admin/parties");
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
  const authz = await authorizeWedding();
  if ("error" in authz)
    return {
      success: false,
      deletedCount: 0,
      skippedCount: 0,
      error: authz.error,
    };

  try {
    let deletedCount = 0;
    let skippedCount = 0;

    // deleteParty re-authorizes and scopes by weddingId per item.
    for (const partyId of partyIds) {
      const result = await deleteParty(partyId);
      if (result.success) {
        deletedCount++;
      } else {
        skippedCount++;
      }
    }

    revalidatePath("/admin/parties");
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
  const authz = await authorizeWedding();
  if ("error" in authz)
    return { success: false, mergedCount: 0, error: authz.error };

  try {
    let mergedCount = 0;

    // mergeParties re-authorizes and scopes by weddingId per item.
    for (const sourceId of sourcePartyIds) {
      if (sourceId === targetPartyId) continue;
      const result = await mergeParties(sourceId, targetPartyId);
      if (result.success) mergedCount++;
    }

    revalidatePath("/admin/parties");
    revalidatePath("/admin/guests");
    return { success: true, mergedCount };
  } catch (error) {
    console.error("Error bulk merging parties:", error);
    return { success: false, mergedCount: 0, error: "Failed to merge parties" };
  }
}

/**
 * Helper function to delete a party if it has no guests remaining.
 * Always scoped to the wedding so it can never remove another tenant's party.
 */
async function deleteEmptyParty(
  partyId: string,
  weddingId: string,
): Promise<void> {
  try {
    const guestCount = await db.guest.count({
      where: { partyId, weddingId },
    });

    if (guestCount === 0) {
      await db.party.deleteMany({
        where: { id: partyId, weddingId },
      });
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
