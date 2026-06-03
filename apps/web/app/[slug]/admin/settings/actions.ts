"use server";

// Each action ends with `revalidatePath(`/${slug}`, "layout")` so picker
// changes feel instant. Scoped to the specific wedding's slug so editing one
// tenant's settings doesn't invalidate every other tenant's layout cache.
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";
import { isValidFontId } from "@/lib/fonts";
import { isValidTemplateId } from "@/lib/templates";
import {
  type DesignConfig,
  designConfigSchema,
  headcountConfigSchema,
} from "@/lib/validations/wedding-content";

/**
 * Read-merge a partial update into the wedding's designConfig JSON.
 *
 * Wrapped in a transaction with row-level locking (`SELECT ... FOR UPDATE`)
 * because the merge happens in JS — without the lock, two concurrent updates
 * (e.g. an admin switching font + another switching template in parallel)
 * race and one write silently overwrites the other.
 */
async function updateDesignConfig(patch: Partial<DesignConfig>) {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ design_config: unknown }[]>`
        SELECT design_config
        FROM weddings
        WHERE id = ${weddingId}::uuid
        FOR UPDATE
      `;
      const existing = designConfigSchema.parse(rows[0]?.design_config ?? {});
      const next = { ...existing, ...patch };
      await tx.wedding.update({
        where: { id: weddingId },
        data: { designConfig: next },
      });
    });

    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating design config:", error);
    return { success: false, error: "Failed to update design settings" };
  }
}

export async function updateFont(fontId: string) {
  if (!isValidFontId(fontId)) {
    return { success: false, error: "Unknown font pairing" };
  }
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
  if (!isValidTemplateId(templateId)) {
    return { success: false, error: "Unknown template" };
  }

  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { templateId },
    });

    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

/**
 * Update just the wedding's couple name. Carved out from updateGeneralSettings
 * so the inline customizer's Cover editor can edit the headline on
 * couple-names templates (Elegant-style) without dragging the whole
 * General-settings form along. Wedding.coupleName is also used in nav, footer,
 * and email templates, so revalidating the slug layout cascades the change.
 */
export async function updateCoupleName(coupleName: string) {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  const trimmed = coupleName.trim();
  if (!trimmed) return { success: false, error: "Couple name is required" };
  if (trimmed.length > 200)
    return { success: false, error: "Couple name is too long" };

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { coupleName: trimmed },
    });
    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating couple name:", error);
    return { success: false, error: "Failed to update couple name" };
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
  const { weddingId, slug } = await getWeddingContext();
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

    revalidatePath(`/${slug}`, "layout");
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
  const { weddingId, slug } = await getWeddingContext();
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

    revalidatePath(`/${slug}`, "layout");
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
  const { weddingId, slug } = await getWeddingContext();
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

    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating branding settings:", error);
    return { success: false, error: "Failed to update branding settings" };
  }
}

export async function updateFeatureToggles(data: Record<string, boolean>) {
  const { weddingId, slug } = await getWeddingContext();
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

    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating feature toggles:", error);
    return { success: false, error: "Failed to update feature toggles" };
  }
}

export async function updateHeadcountConfig(data: {
  label: string;
  includedLists: string[];
  excludeThreeAndUnder: boolean;
  excludeUnder21: boolean;
}) {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  // Validate + coerce via the shared schema — unknown lists are rejected and an
  // empty/blank label falls back to the default so the card never goes blank.
  const parsed = headcountConfigSchema.safeParse({
    label: data.label.trim() || undefined,
    includedLists: data.includedLists,
    excludeThreeAndUnder: data.excludeThreeAndUnder,
    excludeUnder21: data.excludeUnder21,
  });
  if (!parsed.success) {
    return { success: false, error: "Invalid headcount criteria" };
  }

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { headcountConfig: parsed.data },
    });

    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating headcount config:", error);
    return { success: false, error: "Failed to update headcount settings" };
  }
}

export async function updateTheme(themeId: string) {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { themeId },
    });

    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating theme:", error);
    return { success: false, error: "Failed to update theme" };
  }
}

export async function updateDefaultLanguage(language: string) {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.wedding.update({
      where: { id: weddingId },
      data: { defaultLanguage: language },
    });

    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error updating default language:", error);
    return { success: false, error: "Failed to update default language" };
  }
}

export async function inviteAdmin(data: { email: string; role: string }) {
  const { weddingId, slug } = await getWeddingContext();
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

    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error inviting admin:", error);
    return { success: false, error: "Failed to invite admin" };
  }
}

export async function removeAdmin(adminId: string) {
  const { weddingId, slug } = await getWeddingContext();
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

    revalidatePath(`/${slug}`, "layout");
    return { success: true };
  } catch (error) {
    console.error("Error removing admin:", error);
    return { success: false, error: "Failed to remove admin" };
  }
}

export async function getAdmins() {
  const { weddingId } = await getWeddingContext();
  return db.weddingAdmin.findMany({
    where: { weddingId },
    orderBy: { createdAt: "asc" },
  });
}
