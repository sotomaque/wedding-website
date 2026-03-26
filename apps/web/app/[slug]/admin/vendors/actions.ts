"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext, getWeddingId } from "@/lib/db/wedding-context";

export type ServiceLinkCategory =
  | "venue"
  | "catering"
  | "photography"
  | "music"
  | "flowers"
  | "other";

export type ServiceLink = {
  id: string;
  weddingId: string | null;
  title: string;
  url: string;
  description: string | null;
  category: ServiceLinkCategory;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function getServiceLinks(): Promise<ServiceLink[]> {
  try {
    const weddingId = await getWeddingId();
    const rows = await db.serviceLink.findMany({
      where: { weddingId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows as ServiceLink[];
  } catch (error) {
    console.error("Error fetching service links:", error);
    throw error;
  }
}

export async function createServiceLink(data: {
  title: string;
  url: string;
  description: string;
  category: ServiceLinkCategory;
}): Promise<{ success: boolean; link?: ServiceLink; error?: string }> {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const title = data.title.trim();
    const url = data.url.trim();
    if (!title) return { success: false, error: "Title is required" };
    if (!url) return { success: false, error: "URL is required" };

    // Validate URL
    try {
      new URL(url);
    } catch {
      return { success: false, error: "Please enter a valid URL" };
    }

    const { weddingId, slug } = await getWeddingContext();

    // Get max sortOrder to append at end
    const last = await db.serviceLink.aggregate({
      where: { weddingId },
      _max: { sortOrder: true },
    });

    const nextOrder = (last._max.sortOrder ?? 0) + 1;

    const link = await db.serviceLink.create({
      data: {
        title,
        url,
        description: data.description.trim() || null,
        category: data.category,
        sortOrder: nextOrder,
        weddingId,
      },
    });

    revalidatePath(`/${slug}/admin/vendors`);
    revalidatePath(`/${slug}/vendors`);
    return { success: true, link: link as ServiceLink };
  } catch (error) {
    console.error("Error creating service link:", error);
    return { success: false, error: "Failed to create link" };
  }
}

export async function updateServiceLink(
  id: string,
  data: {
    title?: string;
    url?: string;
    description?: string;
    category?: ServiceLinkCategory;
  },
): Promise<{ success: boolean; link?: ServiceLink; error?: string }> {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    if (data.url !== undefined) {
      try {
        new URL(data.url.trim());
      } catch {
        return { success: false, error: "Please enter a valid URL" };
      }
    }

    const { slug } = await getWeddingContext();
    const link = await db.serviceLink.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.url !== undefined && { url: data.url.trim() }),
        ...(data.description !== undefined && {
          description: data.description.trim() || null,
        }),
        ...(data.category !== undefined && { category: data.category }),
      },
    });

    revalidatePath(`/${slug}/admin/vendors`);
    revalidatePath(`/${slug}/vendors`);
    return { success: true, link: link as ServiceLink };
  } catch (error) {
    console.error("Error updating service link:", error);
    return { success: false, error: "Failed to update link" };
  }
}

export async function deleteServiceLink(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const { slug } = await getWeddingContext();
    await db.serviceLink.delete({ where: { id } });
    revalidatePath(`/${slug}/admin/vendors`);
    revalidatePath(`/${slug}/vendors`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting service link:", error);
    return { success: false, error: "Failed to delete link" };
  }
}

export async function reorderServiceLinks(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const { slug } = await getWeddingContext();
    await Promise.all(
      orderedIds.map((id, index) =>
        db.serviceLink.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    revalidatePath(`/${slug}/admin/vendors`);
    revalidatePath(`/${slug}/vendors`);
    return { success: true };
  } catch (error) {
    console.error("Error reordering service links:", error);
    return { success: false, error: "Failed to reorder links" };
  }
}
