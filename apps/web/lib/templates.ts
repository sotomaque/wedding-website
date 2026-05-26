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
   * content (e.g. "lovebird-elegant" → Harper & James / Seattle demo data).
   */
  seedFlavor: string;
  /**
   * How the hero renders its dominant headline. "title" uses the uppercase
   * tracked serif treatment driven by `content.hero.title`. "couple-names"
   * renders the wedding's couple name in the heading font without uppercase
   * tracking — the Lovebird-style script look.
   */
  heroDisplay: "title" | "couple-names";
  /**
   * Which Schedule component renders for this template. "timeline" is the
   * existing flat time/event/description list (Classic). "events-card" is
   * the Lovebird-style rich event row (stacked date + uppercase label +
   * venue + description + address) driven by the events table.
   */
  scheduleStyle: "timeline" | "events-card";
  /**
   * Which Our Story variant renders. "photo-grid" is the existing
   * main-photo + 3-secondary-photo layout (Classic). "prose-only" is the
   * Lovebird-style centered narrow column without any imagery.
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
    id: "lovebird-elegant",
    name: "Elegant",
    description:
      "Dark forest green with cream and script headings — Lovebird-style",
    layoutId: "lovebird-elegant",
    motifId: "floral-roses",
    defaultThemeId: "lovebird-elegant",
    defaultFontId: "lovebird-elegant",
    seedFlavor: "lovebird-elegant",
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
