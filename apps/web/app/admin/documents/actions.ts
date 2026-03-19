"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type DocumentCategory =
  | "contract"
  | "receipt"
  | "floor_plan"
  | "timeline"
  | "other";

export interface Document {
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
}

export async function getDocuments(
  category?: DocumentCategory,
): Promise<Document[]> {
  try {
    let query = db
      .selectFrom("documents")
      .selectAll()
      .orderBy("created_at", "desc");

    if (category) {
      query = query.where("category", "=", category);
    }

    const rows = await query.execute();
    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
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
  try {
    const title = data.title.trim();
    if (!title) return { success: false, error: "Title is required" };
    if (!data.file_url)
      return { success: false, error: "File URL is required" };

    await db
      .insertInto("documents")
      .values({
        title,
        description: data.description.trim() || null,
        file_url: data.file_url,
        file_type: data.file_type,
        file_size: data.file_size,
        category: data.category,
        uploaded_by: data.uploaded_by,
      })
      .execute();

    revalidatePath("/admin/documents");
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
  try {
    await db
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

    revalidatePath("/admin/documents");
    return { success: true };
  } catch (error) {
    console.error("Error updating document:", error);
    return { success: false, error: "Failed to update document" };
  }
}

export async function deleteDocument(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.deleteFrom("documents").where("id", "=", id).execute();
    revalidatePath("/admin/documents");
    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, error: "Failed to delete document" };
  }
}
