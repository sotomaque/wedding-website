"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext, getWeddingId } from "@/lib/db/wedding-context";

export type VenueType = "ceremony" | "reception";

export type Activity = {
  id: string;
  weddingId: string;
  name: string;
  description: string | null;
  emoji: string | null;
  address: string | null;
  link: string | null;
  imageUrl: string | null;
  isVenue: boolean | null;
  venueType: VenueType | null;
  displayOrder: number | null;
};

export interface ActivityInput {
  name: string;
  description?: string;
  emoji?: string;
  address?: string;
  link?: string;
  imageUrl?: string;
  isVenue?: boolean;
  venueType?: VenueType | null;
}

const ACTIVITY_SELECT = {
  id: true,
  weddingId: true,
  name: true,
  description: true,
  emoji: true,
  address: true,
  link: true,
  imageUrl: true,
  isVenue: true,
  venueType: true,
  displayOrder: true,
} as const;

function revalidateActivities(slug: string) {
  revalidatePath(`/${slug}/admin/activities`);
  revalidatePath(`/${slug}/things-to-do`);
}

/**
 * Normalize the venue fields: a venueType only makes sense when isVenue is on,
 * so it's cleared otherwise to keep the public page's venue/teaser split clean.
 */
function venueFields(data: ActivityInput): {
  isVenue: boolean;
  venueType: VenueType | null;
} {
  const isVenue = data.isVenue ?? false;
  return { isVenue, venueType: isVenue ? (data.venueType ?? null) : null };
}

export async function getActivitiesForAdmin(): Promise<Activity[]> {
  try {
    const weddingId = await getWeddingId();
    const activities = await db.activity.findMany({
      where: { weddingId },
      orderBy: { displayOrder: "asc" },
      select: ACTIVITY_SELECT,
    });
    return activities as Activity[];
  } catch (error) {
    console.error("Error fetching activities:", error);
    throw error;
  }
}

export async function createActivity(
  data: ActivityInput,
): Promise<{ success: boolean; activity?: Activity; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const name = data.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const last = await db.activity.aggregate({
      where: { weddingId },
      _max: { displayOrder: true },
    });

    const activity = await db.activity.create({
      data: {
        weddingId,
        name,
        description: data.description?.trim() || null,
        emoji: data.emoji?.trim() || null,
        address: data.address?.trim() || null,
        link: data.link?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        ...venueFields(data),
        displayOrder: (last._max.displayOrder ?? 0) + 1,
      },
      select: ACTIVITY_SELECT,
    });

    revalidateActivities(slug);
    return { success: true, activity: activity as Activity };
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
    const name = data.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const result = await db.activity.updateMany({
      where: { id, weddingId },
      data: {
        name,
        description: data.description?.trim() || null,
        emoji: data.emoji?.trim() || null,
        address: data.address?.trim() || null,
        link: data.link?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        ...venueFields(data),
      },
    });
    if (result.count === 0)
      return { success: false, error: "Activity not found" };

    revalidateActivities(slug);
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
    await db.activity.deleteMany({ where: { id, weddingId } });
    revalidateActivities(slug);
    return { success: true };
  } catch (error) {
    console.error("Error deleting activity:", error);
    return { success: false, error: "Failed to delete activity" };
  }
}

export async function reorderActivities(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.activity.updateMany({
          where: { id, weddingId },
          data: { displayOrder: index + 1 },
        }),
      ),
    );
    revalidateActivities(slug);
    return { success: true };
  } catch (error) {
    console.error("Error reordering activities:", error);
    return { success: false, error: "Failed to reorder activities" };
  }
}
