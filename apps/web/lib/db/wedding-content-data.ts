/**
 * Wedding Content & Settings Data Access Layer
 *
 * Provides cached, typed accessors for per-wedding content and configuration.
 * All functions are cached per-request via React.cache() to avoid duplicate DB hits.
 */

import { cache } from "react";
import type {
  ContentSection,
  DetailsContent,
  FeatureToggles,
  HeroContent,
  RsvpContent,
  ScheduleContent,
  StoryContent,
} from "@/lib/validations/wedding-content";
import { featureTogglesSchema } from "@/lib/validations/wedding-content";
import { db } from "./index";
import { getWeddingId } from "./wedding-context";

// --- Wedding Settings ---

export interface WeddingSettings {
  id: string;
  slug: string;
  coupleName: string;
  person1Name: string | null;
  person2Name: string | null;
  weddingDate: Date;
  rsvpDeadline: string | null;
  timezone: string;
  status: string;
  contactEmail: string | null;
  notificationEmails: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  brandImageUrl: string | null;
  brandImageAlt: string | null;
  featureToggles: FeatureToggles;
}

export const getWeddingSettings = cache(async (): Promise<WeddingSettings> => {
  const weddingId = await getWeddingId();
  const wedding = await db.wedding.findUniqueOrThrow({
    where: { id: weddingId },
    select: {
      id: true,
      slug: true,
      coupleName: true,
      person1Name: true,
      person2Name: true,
      weddingDate: true,
      rsvpDeadline: true,
      timezone: true,
      status: true,
      contactEmail: true,
      notificationEmails: true,
      emailFromName: true,
      emailFromAddress: true,
      brandImageUrl: true,
      brandImageAlt: true,
      featureToggles: true,
    },
  });

  // Parse feature toggles with defaults
  const toggles = featureTogglesSchema.parse(wedding.featureToggles ?? {});

  return {
    ...wedding,
    featureToggles: toggles,
  };
});

// --- Wedding Content ---

export type WeddingContentMap = Partial<Record<ContentSection, unknown>>;

/**
 * Fetch all content sections for the current wedding in a single query.
 * Returns a map of section name → content JSON.
 */
export const getWeddingContentSections = cache(
  async (): Promise<WeddingContentMap> => {
    const weddingId = await getWeddingId();
    const rows = await db.weddingContent.findMany({
      where: { weddingId },
    });
    return Object.fromEntries(
      rows.map((r) => [r.section, r.content]),
    ) as WeddingContentMap;
  },
);

// --- Typed Section Accessors ---

export async function getHeroContent(): Promise<HeroContent | undefined> {
  const sections = await getWeddingContentSections();
  return sections.hero as HeroContent | undefined;
}

export async function getStoryContent(): Promise<StoryContent | undefined> {
  const sections = await getWeddingContentSections();
  return sections.story as StoryContent | undefined;
}

export async function getDetailsContent(): Promise<DetailsContent | undefined> {
  const sections = await getWeddingContentSections();
  return sections.details as DetailsContent | undefined;
}

export async function getScheduleContent(): Promise<
  ScheduleContent | undefined
> {
  const sections = await getWeddingContentSections();
  return sections.schedule as ScheduleContent | undefined;
}

export async function getRsvpContent(): Promise<RsvpContent | undefined> {
  const sections = await getWeddingContentSections();
  return sections.rsvp as RsvpContent | undefined;
}
