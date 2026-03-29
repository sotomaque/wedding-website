"use server";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getDefaultTemplates } from "@/lib/email/default-templates";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { sendEmail } from "@/lib/email/resend-client";

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "sign-in",
  "sign-up",
  "dashboard",
  "onboarding",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export async function validateSlug(
  slug: string,
): Promise<{ valid: boolean; error?: string }> {
  if (!slug || slug.length < 3) {
    return { valid: false, error: "Slug must be at least 3 characters" };
  }
  if (slug.length > 50) {
    return { valid: false, error: "Slug must be 50 characters or less" };
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return {
      valid: false,
      error: "Only lowercase letters, numbers, and hyphens allowed",
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, error: "This URL is reserved" };
  }

  const existing = await db.wedding.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) {
    return { valid: false, error: "This URL is already taken" };
  }

  return { valid: true };
}

export async function createWedding(data: {
  person1Name: string;
  person2Name: string;
  slug: string;
  weddingDate: string;
  timezone: string;
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  receptionVenue?: string;
  receptionAddress?: string;
}): Promise<{ success: boolean; error?: string; slug?: string }> {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) return { success: false, error: "No email address found" };

    const slugCheck = await validateSlug(data.slug);
    if (!slugCheck.valid) return { success: false, error: slugCheck.error };

    const coupleName = `${data.person1Name} & ${data.person2Name}`;

    const wedding = await db.wedding.create({
      data: {
        slug: data.slug,
        coupleName,
        person1Name: data.person1Name,
        person2Name: data.person2Name,
        weddingDate: new Date(data.weddingDate),
        timezone: data.timezone,
        contactEmail: userEmail,
        notificationEmails: userEmail,
        emailFromName: coupleName,
        status: "draft",
        featureToggles: {
          hotels: true,
          vendors: false,
          thingsToDo: false,
          tripPlanner: false,
          registry: true,
          guestPhotos: true,
          slideshow: true,
        },
      },
    });

    await db.weddingAdmin.create({
      data: {
        weddingId: wedding.id,
        clerkUserId: user.id,
        email: userEmail,
        role: "owner",
      },
    });

    if (data.ceremonyVenue) {
      await db.event.create({
        data: {
          weddingId: wedding.id,
          name: "Ceremony",
          locationName: data.ceremonyVenue,
          locationAddress: data.ceremonyAddress || null,
          eventDate: new Date(data.weddingDate),
          isDefault: true,
          displayOrder: 1,
        },
      });
    }

    if (data.receptionVenue) {
      await db.event.create({
        data: {
          weddingId: wedding.id,
          name: "Reception",
          locationName: data.receptionVenue,
          locationAddress: data.receptionAddress || null,
          eventDate: new Date(data.weddingDate),
          isDefault: true,
          displayOrder: 2,
        },
      });
    }

    await db.emailTemplate.createMany({
      data: getDefaultTemplates(wedding.id),
    });

    await db.weddingContent.createMany({
      data: [
        {
          weddingId: wedding.id,
          section: "hero",
          content: { title: coupleName },
        },
        {
          weddingId: wedding.id,
          section: "story",
          content: {
            title: "Our Story",
            paragraphs: ["Tell your story here..."],
          },
        },
        {
          weddingId: wedding.id,
          section: "details",
          content: {
            title: "Wedding Details",
            ceremony: data.ceremonyVenue
              ? {
                  title: "Ceremony",
                  venue: data.ceremonyVenue,
                  address: data.ceremonyAddress || "",
                }
              : undefined,
            reception: data.receptionVenue
              ? {
                  title: "Reception",
                  venue: data.receptionVenue,
                  address: data.receptionAddress || "",
                }
              : undefined,
          },
        },
        {
          weddingId: wedding.id,
          section: "schedule",
          content: { title: "Schedule", events: [] },
        },
        {
          weddingId: wedding.id,
          section: "rsvp",
          content: { title: "RSVP" },
        },
      ],
    });

    // Notify platform admins
    const adminEmails =
      env.ADMIN_EMAILS?.split(",")
        .map((e) => e.trim())
        .filter(Boolean) ?? [];
    const appUrl = env.NEXT_PUBLIC_APP_URL || "https://theceremony.app";

    if (adminEmails.length > 0) {
      await sendEmail({
        from: `The Ceremony <noreply@theceremony.app>`,
        to: adminEmails,
        subject: `New Wedding Created: ${coupleName}`,
        html: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>New Wedding Created</h2>
      <p><strong>${coupleName}</strong> just created their wedding!</p>
      <ul>
        <li>Slug: <code>${wedding.slug}</code></li>
        <li>Date: ${data.weddingDate}</li>
        <li>Creator: ${user.emailAddresses[0]?.emailAddress}</li>
      </ul>
      <a href="${appUrl}/platform-admin" style="display:inline-block;padding:12px 24px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;">View in Platform Admin</a>
    </div>`,
      }).catch((err) =>
        console.error("Failed to send admin notification:", err),
      );
    }

    // Send welcome email to the creator
    const welcomeRendered = await renderEmailTemplate(
      wedding.id,
      "welcome",
      {
        COUPLE_NAMES: coupleName,
        ADMIN_URL: `${appUrl}/${wedding.slug}/admin`,
        APP_URL: appUrl,
      },
      "en",
    );
    if (welcomeRendered) {
      await sendEmail({
        from: `The Ceremony <noreply@theceremony.app>`,
        to: user.emailAddresses[0]?.emailAddress ?? "",
        subject: welcomeRendered.subject,
        html: welcomeRendered.html,
      }).catch((err) => console.error("Failed to send welcome email:", err));
    }

    redirect(`/${wedding.slug}/admin`);
  } catch (error) {
    if (
      error instanceof Error &&
      "digest" in error &&
      typeof (error as Record<string, unknown>).digest === "string" &&
      ((error as Record<string, unknown>).digest as string).startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw error;
    }
    console.error("Error creating wedding:", error);
    return { success: false, error: "Failed to create wedding" };
  }
}
