"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";

/**
 * Permanently hide the admin onboarding checklist for this wedding. Item
 * completion is auto-detected, so there's nothing else to persist.
 */
export async function dismissOnboardingChecklist() {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized) {
    return { success: false, error: auth.error ?? "Unauthorized" };
  }

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { onboardingDismissed: true },
    });
    revalidatePath(`/${slug}/admin`);
    return { success: true };
  } catch (error) {
    console.error("Error dismissing onboarding checklist:", error);
    return { success: false, error: "Failed to dismiss checklist" };
  }
}
