/**
 * Wedding Content & Settings Data Access Layer
 *
 * Provides cached, typed accessors for per-wedding content and configuration.
 * All functions are cached per-request via React.cache() to avoid duplicate DB hits.
 */

import { cache } from "react";
import type {
  ContentSection,
  DesignConfig,
  DetailsContent,
  FeatureToggles,
  HeadcountConfig,
  HeroContent,
  RsvpContent,
  ScheduleContent,
  StoryContent,
} from "@/lib/validations/wedding-content";
import {
  designConfigSchema,
  featureTogglesSchema,
  headcountConfigSchema,
} from "@/lib/validations/wedding-content";
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
  themeId: string | null;
  templateId: string | null;
  defaultLanguage: string;
  featureToggles: FeatureToggles;
  designConfig: DesignConfig;
  headcountConfig: HeadcountConfig;
  registryWishlistUrl: string | null;
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
      themeId: true,
      templateId: true,
      defaultLanguage: true,
      featureToggles: true,
      designConfig: true,
      headcountConfig: true,
      registryWishlistUrl: true,
    },
  });

  // Parse feature toggles + design + headcount config with defaults
  const toggles = featureTogglesSchema.parse(wedding.featureToggles ?? {});
  const design = designConfigSchema.parse(wedding.designConfig ?? {});
  const headcount = headcountConfigSchema.parse(wedding.headcountConfig ?? {});

  return {
    ...wedding,
    featureToggles: toggles,
    designConfig: design,
    headcountConfig: headcount,
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

// --- Events ---

export interface WeddingEvent {
  id: string;
  name: string;
  description: string | null;
  eventDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  locationName: string | null;
  locationAddress: string | null;
}

/**
 * All events for the current wedding, ordered by displayOrder. Cached per
 * request — `getCeremonyAndReception` and the public page's schedule
 * section both consume this so the events table is queried at most once.
 */
export const getEvents = cache(async (): Promise<WeddingEvent[]> => {
  const weddingId = await getWeddingId();
  return db.event.findMany({
    where: { weddingId },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      locationName: true,
      locationAddress: true,
    },
  });
});

// --- Ceremony / Reception derived from Events ---

interface VenueInfo {
  title: string;
  venue: string;
  address?: string;
  time?: string;
}

function formatEventTime(time: Date | null): string | undefined {
  if (!time) return undefined;
  // Prisma maps PG `time` columns to a Date with the time-of-day component.
  const iso = time.toISOString();
  const hh = Number.parseInt(iso.slice(11, 13), 10);
  const mm = iso.slice(14, 16);
  const ampm = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 || 12;
  return `${hour12}:${mm} ${ampm}`;
}

/**
 * Derive ceremony / reception venue cards for the public details section
 * from the events table — single source of truth so editing an event also
 * updates the page. Matches by case-insensitive name contains.
 */
export const getCeremonyAndReception = cache(
  async (): Promise<{
    ceremony: VenueInfo | undefined;
    reception: VenueInfo | undefined;
  }> => {
    const events = await getEvents();

    function pick(kind: "ceremony" | "reception"): VenueInfo | undefined {
      const ev = events.find((e) => e.name.toLowerCase().includes(kind));
      if (!ev) return undefined;
      const venue = ev.locationName?.trim() ?? "";
      const address = ev.locationAddress?.trim() ?? "";
      const time = formatEventTime(ev.startTime ?? null);
      if (!venue && !address && !time) return undefined;
      return {
        title: ev.name,
        venue,
        address: address || undefined,
        time,
      };
    }

    return { ceremony: pick("ceremony"), reception: pick("reception") };
  },
);

// --- Teaser data (hotels / activities / registry) ---

export interface TeaserHotel {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  distanceToVenue: string | null;
  websiteUrl: string | null;
  phone: string | null;
}

export const getHotels = cache(async (): Promise<TeaserHotel[]> => {
  const weddingId = await getWeddingId();
  return db.hotel.findMany({
    where: { weddingId },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      distanceToVenue: true,
      websiteUrl: true,
      phone: true,
    },
  });
});

export interface TeaserActivity {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  imageUrl: string | null;
}

export const getTeaserActivities = cache(
  async (): Promise<TeaserActivity[]> => {
    const weddingId = await getWeddingId();
    return db.activity.findMany({
      where: { weddingId, isVenue: { not: true } },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        emoji: true,
        imageUrl: true,
      },
      take: 6,
    });
  },
);

export interface TeaserRegistryItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  emoji: string | null;
  stripeUrl: string | null;
}

export const getActiveRegistryItems = cache(
  async (): Promise<TeaserRegistryItem[]> => {
    const weddingId = await getWeddingId();
    return db.registryItem.findMany({
      where: { weddingId, isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        emoji: true,
        stripeUrl: true,
      },
    });
  },
);
