"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

export async function updateGeneralSettings(data: {
  coupleName: string;
  person1Name: string;
  person2Name: string;
  weddingDate: string;
  timezone: string;
  rsvpDeadline?: string;
  status: string;
}) {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const weddingId = await getWeddingId();

    await db.wedding.update({
      where: { id: weddingId },
      data: {
        coupleName: data.coupleName.trim(),
        person1Name: data.person1Name.trim() || null,
        person2Name: data.person2Name.trim() || null,
        weddingDate: new Date(data.weddingDate),
        timezone: data.timezone.trim(),
        rsvpDeadline: data.rsvpDeadline?.trim() || null,
        status: data.status as "draft" | "published" | "archived",
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating general settings:", error);
    return { success: false, error: "Failed to update general settings" };
  }
}

export async function updateNotificationSettings(data: {
  contactEmail: string;
  notificationEmails: string;
  emailFromName: string;
  emailFromAddress: string;
}) {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const weddingId = await getWeddingId();

    await db.wedding.update({
      where: { id: weddingId },
      data: {
        contactEmail: data.contactEmail.trim() || null,
        notificationEmails: data.notificationEmails.trim() || null,
        emailFromName: data.emailFromName.trim() || null,
        emailFromAddress: data.emailFromAddress.trim() || null,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return { success: false, error: "Failed to update notification settings" };
  }
}

export async function updateBrandingSettings(data: {
  brandImageUrl: string;
  brandImageAlt: string;
}) {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const weddingId = await getWeddingId();

    await db.wedding.update({
      where: { id: weddingId },
      data: {
        brandImageUrl: data.brandImageUrl.trim() || null,
        brandImageAlt: data.brandImageAlt.trim() || null,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating branding settings:", error);
    return { success: false, error: "Failed to update branding settings" };
  }
}

export async function updateFeatureToggles(data: Record<string, boolean>) {
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const weddingId = await getWeddingId();

    await db.wedding.update({
      where: { id: weddingId },
      data: {
        featureToggles: data,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating feature toggles:", error);
    return { success: false, error: "Failed to update feature toggles" };
  }
}
