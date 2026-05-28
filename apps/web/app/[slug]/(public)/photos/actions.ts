"use server";

import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

export async function saveGuestPhoto(
  url: string,
  uploaderName: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const weddingId = await getWeddingId();
    await db.guestPhoto.create({
      data: {
        url,
        uploaderName: uploaderName || null,
        isVisible: true,
        weddingId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving guest photo:", error);
    return { success: false, error: "Failed to save photo" };
  }
}
