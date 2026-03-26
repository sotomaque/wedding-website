"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";

export type DocumentCategory =
  | "contract"
  | "receipt"
  | "floor_plan"
  | "timeline"
  | "other";

export type WeddingDocument = {
  id: string;
  weddingId: string | null;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  category: DocumentCategory;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getDocuments(
  category?: DocumentCategory,
): Promise<WeddingDocument[]> {
  try {
    const { weddingId } = await getWeddingContext();
    const rows = await db.document.findMany({
      where: category ? { category, weddingId } : { weddingId },
      orderBy: { createdAt: "desc" },
    });
    return rows as WeddingDocument[];
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
}

export async function createDocument(data: {
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  category: DocumentCategory;
  uploadedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const title = data.title.trim();
    if (!title) return { success: false, error: "Title is required" };
    if (!data.fileUrl) return { success: false, error: "File URL is required" };

    const { weddingId, slug } = await getWeddingContext();

    await db.document.create({
      data: {
        title,
        description: data.description.trim() || null,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        category: data.category,
        uploadedBy: data.uploadedBy,
        weddingId,
      },
    });

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
    const { slug } = await getWeddingContext();

    await db.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && {
          description: data.description.trim() || null,
        }),
        ...(data.category !== undefined && { category: data.category }),
      },
    });

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
    const { slug } = await getWeddingContext();

    await db.document.delete({ where: { id } });
    revalidatePath(`/${slug}/admin/documents`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, error: "Failed to delete document" };
  }
}
