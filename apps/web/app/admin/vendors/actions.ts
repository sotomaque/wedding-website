"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type ServiceLinkCategory =
  | "venue"
  | "catering"
  | "photography"
  | "music"
  | "flowers"
  | "other";

export interface ServiceLink {
  id: string;
  wedding_id: string | null;
  title: string;
  url: string;
  description: string | null;
  category: ServiceLinkCategory;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getServiceLinks(): Promise<ServiceLink[]> {
  try {
    const rows = await db
      .selectFrom("service_links")
      .selectAll()
      .orderBy("sort_order", "asc")
      .orderBy("created_at", "asc")
      .execute();
    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return rows as any;
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
}): Promise<{ success: boolean; error?: string }> {
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

    // Get max sort_order to append at end
    const last = await db
      .selectFrom("service_links")
      .select(db.fn.max("sort_order").as("max_order"))
      .executeTakeFirst();

    const nextOrder = (Number(last?.max_order) || 0) + 1;

    await db
      .insertInto("service_links")
      .values({
        title,
        url,
        description: data.description.trim() || null,
        category: data.category,
        sort_order: nextOrder,
      })
      .execute();

    revalidatePath("/admin/vendors");
    revalidatePath("/vendors");
    return { success: true };
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
): Promise<{ success: boolean; error?: string }> {
  try {
    if (data.url !== undefined) {
      try {
        new URL(data.url.trim());
      } catch {
        return { success: false, error: "Please enter a valid URL" };
      }
    }

    await db
      .updateTable("service_links")
      .set({
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.url !== undefined && { url: data.url.trim() }),
        ...(data.description !== undefined && {
          description: data.description.trim() || null,
        }),
        ...(data.category !== undefined && { category: data.category }),
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .execute();

    revalidatePath("/admin/vendors");
    revalidatePath("/vendors");
    return { success: true };
  } catch (error) {
    console.error("Error updating service link:", error);
    return { success: false, error: "Failed to update link" };
  }
}

export async function deleteServiceLink(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.deleteFrom("service_links").where("id", "=", id).execute();
    revalidatePath("/admin/vendors");
    revalidatePath("/vendors");
    return { success: true };
  } catch (error) {
    console.error("Error deleting service link:", error);
    return { success: false, error: "Failed to delete link" };
  }
}

export async function reorderServiceLinks(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .updateTable("service_links")
          .set({ sort_order: index + 1, updated_at: new Date().toISOString() })
          .where("id", "=", id)
          .execute(),
      ),
    );

    revalidatePath("/admin/vendors");
    revalidatePath("/vendors");
    return { success: true };
  } catch (error) {
    console.error("Error reordering service links:", error);
    return { success: false, error: "Failed to reorder links" };
  }
}
