import { z } from "zod";

// --- Hero Section ---
export const heroContentSchema = z.object({
  title: z.string(),
  /**
   * Optional uppercase location for hero cards that surface it
   * (Lovebird-style "SEATTLE, WASHINGTON" line beneath couple names + date).
   * Templates that render only a hero title ignore this field.
   */
  location: z.string().optional(),
});
export type HeroContent = z.infer<typeof heroContentSchema>;

// --- Story Section ---
export const storyPhotoSchema = z.object({
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
});

export const storyContentSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  subtitleCaption: z.string().optional(),
  paragraphs: z.array(z.string()), // backward compat — plain text
  bodyHtml: z.string().optional(), // rich text (Tiptap HTML output)
  photos: z.array(storyPhotoSchema).optional(),
});
export type StoryContent = z.infer<typeof storyContentSchema>;

// --- Details Section ---
export const venueInfoSchema = z.object({
  icon: z.string().optional(),
  title: z.string(),
  time: z.string().optional(),
  venue: z.string(),
  location: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

export const additionalInfoSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const detailsContentSchema = z.object({
  title: z.string(),
  dateFormatted: z.string().optional(),
  ceremony: venueInfoSchema.optional(),
  reception: venueInfoSchema.optional(),
  additionalInfo: z.array(additionalInfoSchema).optional(),
});
export type DetailsContent = z.infer<typeof detailsContentSchema>;

// --- Schedule Section ---
export const scheduleEventSchema = z.object({
  id: z.string(),
  time: z.string(),
  event: z.string(),
  description: z.string().optional(),
});

export const scheduleContentSchema = z.object({
  title: z.string(),
  events: z.array(scheduleEventSchema),
});
export type ScheduleContent = z.infer<typeof scheduleContentSchema>;

// --- RSVP Section ---
export const rsvpContentSchema = z.object({
  title: z.string(),
});
export type RsvpContent = z.infer<typeof rsvpContentSchema>;

// --- Feature Toggles ---
export const featureTogglesSchema = z.object({
  hotels: z.boolean().default(true),
  vendors: z.boolean().default(true),
  thingsToDo: z.boolean().default(true),
  tripPlanner: z.boolean().default(true),
  registry: z.boolean().default(true),
  guestPhotos: z.boolean().default(true),
  slideshow: z.boolean().default(true),
});
export type FeatureToggles = z.infer<typeof featureTogglesSchema>;

export const dashboardConfigSchema = z.object({
  excludeThreeAndUnder: z.boolean().default(false),
  excludeUnder21: z.boolean().default(false),
  excludePlusOnes: z.boolean().default(false),
});
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;

// --- Design Config (font pairing only) ---
// Layout and motif now ride along with the chosen template (see
// `Wedding.templateId` + `apps/web/lib/templates.ts`) — they are no longer
// stored here. Legacy rows may still carry layoutId/motifId in this JSON
// blob; Zod's default `.strip()` behavior silently drops them on parse, so
// older data validates without throwing and the legacy fields are ignored.
// Color theme stays on the separate `themeId` column.
export const designConfigSchema = z.object({
  fontId: z.string().optional(),
});
export type DesignConfig = z.infer<typeof designConfigSchema>;

// --- Content Section Union ---
export type ContentSection = "hero" | "story" | "details" | "schedule" | "rsvp";

export const contentSectionSchemas: Record<ContentSection, z.ZodType> = {
  hero: heroContentSchema,
  story: storyContentSchema,
  details: detailsContentSchema,
  schedule: scheduleContentSchema,
  rsvp: rsvpContentSchema,
};
