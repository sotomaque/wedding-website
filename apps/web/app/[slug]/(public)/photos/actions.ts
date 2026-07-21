"use server";

import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { isAllowedUploadUrl } from "@/lib/uploadthing-url";

export async function saveGuestPhoto(
  url: string,
  uploaderName: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    // This action is public, and the admin download route fetches this URL
    // server-side — only accept trusted UploadThing URLs (SSRF guard).
    if (!isAllowedUploadUrl(url)) {
      return { success: false, error: "Invalid photo URL" };
    }

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
