"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext, getWeddingId } from "@/lib/db/wedding-context";

export type Activity = {
  id: string;
  weddingId: string;
  name: string;
  description: string | null;
  link: string | null;
  address: string | null;
  emoji: string | null;
  imageUrl: string | null;
  displayOrder: number | null;
  createdAt: Date;
};

interface ActivityInput {
  name: string;
  description?: string;
  link?: string;
  address?: string;
  emoji?: string;
  imageUrl?: string;
}

export async function getActivities(): Promise<Activity[]> {
  const weddingId = await getWeddingId();
  const rows = await db.activity.findMany({
    // Only non-venue activities; ceremony / reception venues live on the
    // events table and are managed at /admin/events.
    where: { weddingId, isVenue: { not: true } },
    orderBy: { displayOrder: "asc" },
  });
  return rows as Activity[];
}

export async function createActivity(
  data: ActivityInput,
): Promise<{ success: boolean; item?: Activity; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  const name = data.name.trim();
  if (!name) return { success: false, error: "Name is required" };

  try {
    const last = await db.activity.aggregate({
      where: { weddingId },
      _max: { displayOrder: true },
    });

    const item = await db.activity.create({
      data: {
        weddingId,
        name,
        description: data.description?.trim() || null,
        link: data.link?.trim() || null,
        address: data.address?.trim() || null,
        emoji: data.emoji?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        isVenue: false,
        displayOrder: (last._max.displayOrder ?? 0) + 1,
      },
    });

    revalidatePath(`/${slug}/admin/things-to-do`);
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/things-to-do`);

    return { success: true, item: item as Activity };
  } catch (error) {
    console.error("Error creating activity:", error);
    return { success: false, error: "Failed to create activity" };
  }
}

export async function updateActivity(
  id: string,
  data: ActivityInput,
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.activity.update({
      where: { id, weddingId },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        link: data.link?.trim() || null,
        address: data.address?.trim() || null,
        emoji: data.emoji?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
      },
    });

    revalidatePath(`/${slug}/admin/things-to-do`);
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/things-to-do`);

    return { success: true };
  } catch (error) {
    console.error("Error updating activity:", error);
    return { success: false, error: "Failed to update activity" };
  }
}

export async function deleteActivity(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.activity.delete({ where: { id, weddingId } });
    revalidatePath(`/${slug}/admin/things-to-do`);
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/things-to-do`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting activity:", error);
    return { success: false, error: "Failed to delete activity" };
  }
}
