"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
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
  wedding_id: string | null;
  title: string;
  url: string;
  description: string | null;
  category: ServiceLinkCategory;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function getServiceLinks(): Promise<ServiceLink[]> {
  try {
    const weddingId = await getWeddingId();
    const rows = await db
      .selectFrom("service_links")
      .where("wedding_id", "=", weddingId)
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
    const weddingDb = forWedding(weddingId);

    // Get max sort_order to append at end
    const last = await db
      .selectFrom("service_links")
      .where("wedding_id", "=", weddingId)
      .select(db.fn.max("sort_order").as("max_order"))
      .executeTakeFirst();

    const nextOrder = (Number(last?.max_order) || 0) + 1;

    const rows = await weddingDb
      .insertInto("service_links", {
        title,
        url,
        description: data.description.trim() || null,
        category: data.category,
        sort_order: nextOrder,
      })
      .returningAll()
      .execute();
    revalidatePath(`/${slug}/admin/vendors`);
    revalidatePath(`/${slug}/vendors`);
    // biome-ignore lint/suspicious/noExplicitAny: Date objects serialize to strings across the server/client boundary
    return { success: true, link: rows[0] as any as ServiceLink };
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

    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);

    const rows = await weddingDb
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
      .returningAll()
      .execute();
    revalidatePath(`/${slug}/admin/vendors`);
    revalidatePath(`/${slug}/vendors`);
    // biome-ignore lint/suspicious/noExplicitAny: Date objects serialize to strings across the server/client boundary
    return { success: true, link: rows[0] as any as ServiceLink };
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
    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);
    await weddingDb.deleteFrom("service_links").where("id", "=", id).execute();
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
    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);

    await Promise.all(
      orderedIds.map((id, index) =>
        weddingDb
          .updateTable("service_links")
          .set({ sort_order: index + 1, updated_at: new Date().toISOString() })
          .where("id", "=", id)
          .execute(),
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
