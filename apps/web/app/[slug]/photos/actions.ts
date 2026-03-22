"use server";

import { forWedding } from "@/lib/db/scoped";
import { getWeddingId } from "@/lib/db/wedding-context";

export async function saveGuestPhoto(
  url: string,
  uploaderName: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);

    await weddingDb
      .insertInto("guest_photos", {
        url,
        uploader_name: uploaderName || null,
        is_visible: true,
      })
      .execute();

    return { success: true };
  } catch (error) {
    console.error("Error saving guest photo:", error);
    return { success: false, error: "Failed to save photo" };
  }
}
