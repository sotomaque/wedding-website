/**
 * Per-template default copy for the text content sections.
 *
 * Keyed by `TemplatePreset.seedFlavor` (the field's long-promised purpose).
 * One source of truth consumed by two places:
 *   - the public render path, as a fallback for empty sections **on draft
 *     sites only** (published sites hide empty sections so guests never see
 *     sample copy);
 *   - the admin content editors, as placeholder text.
 *
 * Only fields that are genuinely empty by default live here: the Story body,
 * the Welcome message, and the Hero location. Section titles keep their
 * existing next-intl / component fallbacks.
 */

export interface TemplateContentDefaults {
  hero?: { location?: string };
  welcome?: { title?: string; message?: string };
  story?: { title?: string; paragraphs?: string[] };
}

export const TEMPLATE_CONTENT_DEFAULTS: Record<
  string,
  TemplateContentDefaults
> = {
  classic: {
    hero: { location: "Seattle, Washington" },
    welcome: {
      title: "Welcome!",
      message:
        "To our friends and family: we're so excited to celebrate our wedding with you. Find all the details you'll need for our big day right here.",
    },
    story: {
      title: "Our Story",
      paragraphs: [
        "This is where your love story comes to life. Tell your guests how you met, the moment you knew, and the journey that led to your wedding day.",
        "Edit this section any time from the Content editor to make it your own.",
      ],
    },
  },
  elegant: {
    hero: { location: "Seattle, Washington" },
    welcome: {
      title: "Welcome",
      message:
        "We're so glad you're here. Join us as we celebrate our wedding — explore the details below to find everything you'll need for our big day.",
    },
    story: {
      title: "Our Story",
      paragraphs: [
        "Every great love has a story worth telling. Share yours here — the chance meeting, the quiet moments, and the adventures that brought you to this day.",
        "Replace this sample with your own words from the Content editor.",
      ],
    },
  },
};

const DEFAULT_FLAVOR = "classic";

/**
 * Defaults for a seedFlavor. Falls back to the classic defaults for unknown,
 * null, or undefined flavors so a new template without curated copy still
 * renders sensibly.
 */
export function getTemplateContentDefaults(
  seedFlavor: string | null | undefined,
): TemplateContentDefaults {
  if (!seedFlavor) {
    return TEMPLATE_CONTENT_DEFAULTS[DEFAULT_FLAVOR] as TemplateContentDefaults;
  }
  return (
    TEMPLATE_CONTENT_DEFAULTS[seedFlavor] ??
    (TEMPLATE_CONTENT_DEFAULTS[DEFAULT_FLAVOR] as TemplateContentDefaults)
  );
}
