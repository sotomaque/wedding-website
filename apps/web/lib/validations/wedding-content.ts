import { z } from "zod";

// --- Hero Section ---
export const heroContentSchema = z.object({
  title: z.string(),
  /**
   * Optional uppercase location for hero cards that surface it
   * (Elegant-style "SEATTLE, WASHINGTON" line beneath couple names + date).
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

// --- Welcome Section ---
export const welcomeContentSchema = z.object({
  title: z.string().optional(),
  message: z.string().optional(),
});
export type WelcomeContent = z.infer<typeof welcomeContentSchema>;

// --- Wedding Party Section ---
export const weddingPartyMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  photoUrl: z.string().optional(),
});

export const weddingPartyContentSchema = z.object({
  title: z.string().optional(),
  members: z.array(weddingPartyMemberSchema),
});
export type WeddingPartyContent = z.infer<typeof weddingPartyContentSchema>;
export type WeddingPartyMember = z.infer<typeof weddingPartyMemberSchema>;

// --- FAQs Section ---
export const faqItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const faqsContentSchema = z.object({
  title: z.string().optional(),
  items: z.array(faqItemSchema),
});
export type FaqsContent = z.infer<typeof faqsContentSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;

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

// --- Headcount Config ---
// Admin-defined criteria for which guests count toward the dashboard's RSVP
// headcount stat. Every field defaults to the historical "count every accepted
// guest across all lists" behavior, so weddings created before this feature —
// whose `headcount_config` is `{}` — render byte-identically.
export const guestListValues = ["a", "b", "c"] as const;

export const headcountConfigSchema = z.object({
  // Heading shown on the dashboard stat card.
  label: z.string().default("Accepted RSVPs"),
  // Which guest lists count toward the headcount. All three by default.
  includedLists: z.array(z.enum(guestListValues)).default([...guestListValues]),
  // Skip children flagged three-and-under (often excluded from venue limits).
  excludeThreeAndUnder: z.boolean().default(false),
  // Skip guests flagged under-21 (e.g. for bar / catering counts).
  excludeUnder21: z.boolean().default(false),
});
export type HeadcountConfig = z.infer<typeof headcountConfigSchema>;

// --- Content Section Union ---
export type ContentSection =
  | "hero"
  | "story"
  | "details"
  | "schedule"
  | "rsvp"
  | "welcome"
  | "wedding-party"
  | "faqs";

export const contentSectionSchemas: Record<ContentSection, z.ZodType> = {
  hero: heroContentSchema,
  story: storyContentSchema,
  details: detailsContentSchema,
  schedule: scheduleContentSchema,
  rsvp: rsvpContentSchema,
  welcome: welcomeContentSchema,
  "wedding-party": weddingPartyContentSchema,
  faqs: faqsContentSchema,
};
