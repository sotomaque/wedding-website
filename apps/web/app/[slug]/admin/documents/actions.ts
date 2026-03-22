"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
import { getWeddingContext, getWeddingId } from "@/lib/db/wedding-context";

export type DocumentCategory =
  | "contract"
  | "receipt"
  | "floor_plan"
  | "timeline"
  | "other";

export type WeddingDocument = {
  id: string;
  wedding_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  category: DocumentCategory;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

export async function getDocuments(
  category?: DocumentCategory,
): Promise<WeddingDocument[]> {
  try {
    const weddingId = await getWeddingId();

    let query = db
      .selectFrom("documents")
      .where("wedding_id", "=", weddingId)
      .selectAll()
      .orderBy("created_at", "desc");

    if (category) {
      query = query.where("category", "=", category);
    }

    const rows = await query.execute();
    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings when passed across the server/client boundary
    return rows as any;
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
}

export async function createDocument(data: {
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  category: DocumentCategory;
  uploaded_by: string;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const title = data.title.trim();
    if (!title) return { success: false, error: "Title is required" };
    if (!data.file_url)
      return { success: false, error: "File URL is required" };

    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);

    await weddingDb
      .insertInto("documents", {
        title,
        description: data.description.trim() || null,
        file_url: data.file_url,
        file_type: data.file_type,
        file_size: data.file_size,
        category: data.category,
        uploaded_by: data.uploaded_by,
      })
      .execute();
    revalidatePath(`/${slug}/admin/documents`);
    return { success: true };
  } catch (error) {
    console.error("Error creating document:", error);
    return { success: false, error: "Failed to save document" };
  }
}

export async function updateDocument(
  id: string,
  data: {
    title?: string;
    description?: string;
    category?: DocumentCategory;
  },
): Promise<{ success: boolean; error?: string }> {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);

    await weddingDb
      .updateTable("documents")
      .set({
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && {
          description: data.description.trim() || null,
        }),
        ...(data.category !== undefined && { category: data.category }),
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .execute();
    revalidatePath(`/${slug}/admin/documents`);
    return { success: true };
  } catch (error) {
    console.error("Error updating document:", error);
    return { success: false, error: "Failed to update document" };
  }
}

export async function deleteDocument(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);
    await weddingDb.deleteFrom("documents").where("id", "=", id).execute();
    revalidatePath(`/${slug}/admin/documents`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, error: "Failed to delete document" };
  }
}
