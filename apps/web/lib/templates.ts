/**
 * Per-wedding template presets.
 *
 * A template bundles four design choices into a single pickable unit:
 *   - layoutId  → references LAYOUT_PRESETS (section order + nav variant)
 *   - motifId   → references MOTIF_PACKS (decorative dividers between sections)
 *   - defaultThemeId → seed value for `Wedding.themeId` when the user has none
 *   - defaultFontId  → seed value for `designConfig.fontId` when the user has none
 *
 * The Template picker in admin/settings is the dominant Appearance control;
 * Color theme and Typography pickers sit below it as fine-tune options that
 * survive template switches (additive seeding via resolve-on-read — null
 * means "inherit template default", non-null means "user override").
 *
 * Layout and Motif are NOT independently user-pickable — they ride along with
 * the template choice. The underlying LAYOUT_PRESETS / MOTIF_PACKS lookup
 * tables stay; their admin pickers are removed from the Appearance tab.
 *
 * `templateId = null` resolves to the "classic" preset, which captures the
 * site's original production look. Existing weddings render byte-identically
 * without a backfill migration.
 */

import { getLayoutPreset, type SectionKey } from "./layouts";

/** Sections that can render photos, in the order the gallery/render path uses. */
export type PhotoSectionKey = Extract<SectionKey, "hero" | "story" | "gallery">;

/**
 * Maximum photos a section will accept, where a cap makes sense. The hero is a
 * carousel, which reads best with a handful of standout shots; gallery and
 * story are uncapped. Enforced both client-side (drop guard) and server-side
 * (POST /placements). Shared so the two stay in sync.
 */
export const SECTION_PHOTO_CAPS: Partial<Record<PhotoSectionKey, number>> = {
  hero: 8,
};

/** The cap for a section, or null if it accepts unlimited photos. */
export function getSectionPhotoCap(section: string): number | null {
  return SECTION_PHOTO_CAPS[section as PhotoSectionKey] ?? null;
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  /** Reference into LAYOUT_PRESETS — drives section order + nav variant. */
  layoutId: string;
  /** Reference into MOTIF_PACKS — drives decorative section dividers. */
  motifId: string;
  /** Reference into THEME_PRESETS — used when wedding.themeId is null. */
  defaultThemeId: string;
  /** Reference into FONT_PAIRINGS — used when designConfig.fontId is null. */
  defaultFontId: string;
  /**
   * Identifier used by future seeders (Phase 4) to select per-template demo
   * content (e.g. "elegant" → Harper & James / Seattle demo data).
   */
  seedFlavor: string;
  /**
   * How the hero renders its dominant headline. "title" uses the uppercase
   * tracked serif treatment driven by `content.hero.title`. "couple-names"
   * renders the wedding's couple name in the heading font without uppercase
   * tracking — the Elegant-style script look.
   */
  heroDisplay: "title" | "couple-names";
  /**
   * Which Schedule component renders for this template. "timeline" is the
   * existing flat time/event/description list (Classic). "events-card" is
   * the Elegant-style rich event row (stacked date + uppercase label +
   * venue + description + address) driven by the events table.
   */
  scheduleStyle: "timeline" | "events-card";
  /**
   * Which Our Story variant renders. "photo-grid" is the existing
   * main-photo + 3-secondary-photo layout (Classic). "prose-only" is the
   * Elegant-style centered narrow column without any imagery.
   */
  storyStyle: "photo-grid" | "prose-only";
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    // Captures the production look already live for the product owner.
    // Existing weddings with templateId = null also resolve to this preset,
    // so production rendering is byte-identical without a backfill migration.
    id: "classic",
    name: "Classic",
    description:
      "The original timeless wedding site — hero, story, details, schedule, RSVP",
    layoutId: "classic",
    motifId: "none",
    defaultThemeId: "warm-gold",
    defaultFontId: "classic",
    seedFlavor: "classic",
    heroDisplay: "title",
    scheduleStyle: "timeline",
    storyStyle: "photo-grid",
  },
  {
    id: "elegant",
    name: "Elegant",
    description:
      "Dark forest green with cream and script headings — Elegant-style",
    layoutId: "elegant",
    motifId: "floral-roses",
    defaultThemeId: "elegant",
    defaultFontId: "elegant-script",
    seedFlavor: "elegant",
    heroDisplay: "couple-names",
    scheduleStyle: "events-card",
    storyStyle: "prose-only",
  },
];

const DEFAULT_TEMPLATE = TEMPLATE_PRESETS[0] as TemplatePreset;

/**
 * Get a template preset by ID. Returns the default ("classic") if not found
 * — so `null` and unknown IDs both render the production-default look.
 */
export function getTemplatePreset(
  templateId: string | null | undefined,
): TemplatePreset {
  if (!templateId) return DEFAULT_TEMPLATE;
  return TEMPLATE_PRESETS.find((t) => t.id === templateId) ?? DEFAULT_TEMPLATE;
}

/** Whether `id` corresponds to a real template preset. Use to validate
 *  user-supplied IDs at the server-action boundary before writing. */
export function isValidTemplateId(id: string): boolean {
  return TEMPLATE_PRESETS.some((t) => t.id === id);
}

/**
 * The home-page sections that render photos for a given template, in render
 * order. Derived from the template's resolved layout (only sections the layout
 * actually renders) intersected with the photo-capable set {hero, story,
 * gallery}, minus story when the template's Our Story variant is prose-only.
 *
 * Drives the template-aware admin assignment UI and is the canonical rule the
 * migration 056 backfill mirrors — keep the two in sync if presets change.
 *   - classic          → ["hero", "story"]
 *   - elegant → ["hero", "gallery"]
 */
export function getPhotoSections(template: TemplatePreset): PhotoSectionKey[] {
  const rendered = getLayoutPreset(template.layoutId).sections;
  return rendered.filter((section): section is PhotoSectionKey => {
    if (section === "hero" || section === "gallery") return true;
    if (section === "story") return template.storyStyle !== "prose-only";
    return false;
  });
}
