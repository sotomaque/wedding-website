"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext, getWeddingId } from "@/lib/db/wedding-context";

export type RegistryItemType = "fund" | "product";

export type RegistryItem = {
  id: string;
  weddingId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  emoji: string | null;
  stripeUrl: string | null;
  stripeProductId: string | null;
  itemType: RegistryItemType;
  productUrl: string | null;
  priceCents: number | null;
  claimedByName: string | null;
  claimedByEmail: string | null;
  claimedAt: Date | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export interface RegistryItemInput {
  title: string;
  description?: string;
  emoji?: string;
  imageUrl?: string;
  itemType?: RegistryItemType;
  stripeUrl?: string;
  productUrl?: string;
  priceCents?: number | null;
  isActive?: boolean;
}

export async function getRegistryItems(): Promise<RegistryItem[]> {
  try {
    const weddingId = await getWeddingId();
    const items = await db.registryItem.findMany({
      where: { weddingId },
      orderBy: { displayOrder: "asc" },
    });
    return items as RegistryItem[];
  } catch (error) {
    console.error("Error fetching registry items:", error);
    throw error;
  }
}

export async function createRegistryItem(
  data: RegistryItemInput,
): Promise<{ success: boolean; item?: RegistryItem; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const title = data.title.trim();
    if (!title) return { success: false, error: "Title is required" };

    const itemType = data.itemType ?? "fund";
    const last = await db.registryItem.aggregate({
      where: { weddingId },
      _max: { displayOrder: true },
    });

    const item = await db.registryItem.create({
      data: {
        weddingId,
        title,
        description: data.description?.trim() || null,
        emoji: data.emoji?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        itemType,
        // Only keep the link relevant to the chosen type.
        stripeUrl: itemType === "fund" ? data.stripeUrl?.trim() || null : null,
        productUrl:
          itemType === "product" ? data.productUrl?.trim() || null : null,
        priceCents: itemType === "product" ? (data.priceCents ?? null) : null,
        isActive: data.isActive ?? true,
        displayOrder: (last._max.displayOrder ?? 0) + 1,
      },
    });

    revalidatePath(`/${slug}/admin/registry`);
    revalidatePath(`/${slug}/registry`);

    return { success: true, item: item as RegistryItem };
  } catch (error) {
    console.error("Error creating registry item:", error);
    return { success: false, error: "Failed to create registry item" };
  }
}

export async function updateRegistryItem(
  id: string,
  data: Partial<RegistryItemInput>,
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined)
      updateData.description = data.description.trim() || null;
    if (data.emoji !== undefined) updateData.emoji = data.emoji.trim() || null;
    if (data.imageUrl !== undefined)
      updateData.imageUrl = data.imageUrl.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.itemType !== undefined) {
      // Switching type clears the now-irrelevant link so stale data isn't
      // shown publicly.
      updateData.itemType = data.itemType;
      if (data.itemType === "fund") {
        updateData.productUrl = null;
        updateData.priceCents = null;
        updateData.stripeUrl = data.stripeUrl?.trim() || null;
      } else {
        updateData.stripeUrl = null;
        updateData.productUrl = data.productUrl?.trim() || null;
        updateData.priceCents = data.priceCents ?? null;
      }
    } else {
      if (data.stripeUrl !== undefined)
        updateData.stripeUrl = data.stripeUrl.trim() || null;
      if (data.productUrl !== undefined)
        updateData.productUrl = data.productUrl.trim() || null;
      if (data.priceCents !== undefined)
        updateData.priceCents = data.priceCents ?? null;
    }

    await db.registryItem.update({
      where: { id },
      data: updateData,
    });

    revalidatePath(`/${slug}/admin/registry`);
    revalidatePath(`/${slug}/registry`);

    return { success: true };
  } catch (error) {
    console.error("Error updating registry item:", error);
    return { success: false, error: "Failed to update registry item" };
  }
}

export async function deleteRegistryItem(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.registryItem.delete({ where: { id } });

    revalidatePath(`/${slug}/admin/registry`);
    revalidatePath(`/${slug}/registry`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting registry item:", error);
    return { success: false, error: "Failed to delete registry item" };
  }
}

export async function reorderRegistryItems(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.registryItem.update({
          where: { id },
          data: { displayOrder: index + 1, updatedAt: new Date() },
        }),
      ),
    );

    revalidatePath(`/${slug}/admin/registry`);
    revalidatePath(`/${slug}/registry`);

    return { success: true };
  } catch (error) {
    console.error("Error reordering registry items:", error);
    return { success: false, error: "Failed to reorder registry items" };
  }
}

export async function toggleRegistryItemActive(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.registryItem.update({
      where: { id },
      data: { isActive, updatedAt: new Date() },
    });

    revalidatePath(`/${slug}/admin/registry`);
    revalidatePath(`/${slug}/registry`);

    return { success: true };
  } catch (error) {
    console.error("Error toggling registry item:", error);
    return { success: false, error: "Failed to toggle registry item" };
  }
}

/**
 * Set (or clear) the wedding's external registry wishlist URL — shown at the
 * top of the public registry page. Pass an empty string to clear it.
 */
export async function updateRegistryWishlistUrl(
  url: string,
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  const trimmed = url.trim();
  if (trimmed && !/^https?:\/\//i.test(trimmed)) {
    return {
      success: false,
      error: "Enter a valid URL starting with https://",
    };
  }

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { registryWishlistUrl: trimmed || null },
    });

    revalidatePath(`/${slug}/admin/registry`);
    revalidatePath(`/${slug}/registry`);

    return { success: true };
  } catch (error) {
    console.error("Error updating registry wishlist URL:", error);
    return { success: false, error: "Failed to update wishlist link" };
  }
}

/**
 * Admin override: release a claim on a product item (e.g. the claimant backed
 * out), making it available again. Scoped to the wedding for tenant isolation.
 */
export async function releaseRegistryClaim(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.registryItem.updateMany({
      where: { id, weddingId },
      data: {
        claimedByName: null,
        claimedByEmail: null,
        claimedAt: null,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/${slug}/admin/registry`);
    revalidatePath(`/${slug}/registry`);

    return { success: true };
  } catch (error) {
    console.error("Error releasing registry claim:", error);
    return { success: false, error: "Failed to release claim" };
  }
}
