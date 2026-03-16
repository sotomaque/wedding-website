"use server";

import { db } from "@/lib/db";

export async function saveGuestPhoto(
  url: string,
  uploaderName: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .insertInto("guest_photos")
      .values({
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
