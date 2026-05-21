"use server";

import { currentUser } from "@clerk/nextjs/server";
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
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
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
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
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
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
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
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
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

export async function updateTheme(themeId: string) {
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { themeId },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating theme:", error);
    return { success: false, error: "Failed to update theme" };
  }
}

export async function updateDefaultLanguage(language: string) {
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { defaultLanguage: language },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating default language:", error);
    return { success: false, error: "Failed to update default language" };
  }
}

export async function inviteAdmin(data: { email: string; role: string }) {
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  // Only owners can invite admins
  if (auth.role !== "owner" && auth.role !== "superadmin") {
    return { success: false, error: "Only owners can invite admins" };
  }

  const email = data.email.trim().toLowerCase();
  if (!email) return { success: false, error: "Email is required" };

  try {
    // Check if already an admin
    const existing = await db.weddingAdmin.findFirst({
      where: { weddingId, email },
    });
    if (existing)
      return { success: false, error: "This email is already an admin" };

    // Create admin record
    await db.weddingAdmin.create({
      data: {
        weddingId,
        email,
        role: data.role === "editor" ? "editor" : "owner",
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error inviting admin:", error);
    return { success: false, error: "Failed to invite admin" };
  }
}

export async function removeAdmin(adminId: string) {
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  // Only owners can remove admins
  if (auth.role !== "owner" && auth.role !== "superadmin") {
    return { success: false, error: "Only owners can remove admins" };
  }

  try {
    // Get the admin to remove
    const adminToRemove = await db.weddingAdmin.findUnique({
      where: { id: adminId },
    });
    if (!adminToRemove || adminToRemove.weddingId !== weddingId) {
      return { success: false, error: "Admin not found" };
    }

    // Prevent removing yourself
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (adminToRemove.email === userEmail) {
      return { success: false, error: "You cannot remove yourself" };
    }

    await db.weddingAdmin.delete({ where: { id: adminId } });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error removing admin:", error);
    return { success: false, error: "Failed to remove admin" };
  }
}

export async function getAdmins() {
  const weddingId = await getWeddingId();
  return db.weddingAdmin.findMany({
    where: { weddingId },
    orderBy: { createdAt: "asc" },
  });
}
