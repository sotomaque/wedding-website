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
        // Moderation queue: guest uploads start hidden and only reach the
        // public gallery/slideshow once the couple approves them in
        // Admin → Photos → Guest Photos. This is the sole gate protecting a
        // no-auth, no-rate-limit upload endpoint from spamming the live site.
        isVisible: false,
        weddingId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving guest photo:", error);
    return { success: false, error: "Failed to save photo" };
  }
}
