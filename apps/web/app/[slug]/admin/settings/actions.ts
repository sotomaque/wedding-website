"use server";

// Each action ends with `revalidatePath("/[slug]", "layout")` so picker
// changes feel instant. The dynamic route literal invalidates the layout
// segment for all weddings (which cascades to admin + public pages); a
// multi-tenant scope is fine because each action is gated by weddingId.
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import {
  type DesignConfig,
  designConfigSchema,
} from "@/lib/validations/wedding-content";

/**
 * Read-merge a partial update into the wedding's designConfig JSON so that
 * updating one field (font/layout/motif) never clobbers the others.
 */
async function updateDesignConfig(patch: Partial<DesignConfig>) {
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const current = await db.wedding.findUniqueOrThrow({
      where: { id: weddingId },
      select: { designConfig: true },
    });
    const existing = designConfigSchema.parse(current.designConfig ?? {});
    const next = { ...existing, ...patch };

    await db.wedding.update({
      where: { id: weddingId },
      data: { designConfig: next },
    });

    revalidatePath("/[slug]", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating design config:", error);
    return { success: false, error: "Failed to update design settings" };
  }
}

export async function updateFont(fontId: string) {
  return updateDesignConfig({ fontId });
}

/**
 * Switch the wedding's template. Additive by design: only `templateId`
 * changes — the user's color theme (`themeId`) and font pairing
 * (`designConfig.fontId`) are preserved across the switch. Null fields fall
 * back to the new template's defaults at render time (resolve-on-read),
 * matching the Zola / The Knot / Withjoy industry pattern.
 */
export async function updateTemplate(templateId: string) {
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { templateId },
    });

    revalidatePath("/[slug]", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

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

    revalidatePath("/[slug]", "layout");
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

    revalidatePath("/[slug]", "layout");
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

    revalidatePath("/[slug]", "layout");
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

    revalidatePath("/[slug]", "layout");
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

    revalidatePath("/[slug]", "layout");
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

    revalidatePath("/[slug]", "layout");
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

    revalidatePath("/[slug]", "layout");
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

    revalidatePath("/[slug]", "layout");
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
