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

import type {
  HeroContent,
  StoryContent,
  WelcomeContent,
} from "@/lib/validations/wedding-content";

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

/** True when the story has author-provided body content. */
function storyHasBody(content: StoryContent | undefined): boolean {
  return !!content?.bodyHtml || (content?.paragraphs?.length ?? 0) > 0;
}

/**
 * Effective story content for rendering. The user's content wins; an empty
 * story falls back to the template default body only on draft sites. Published
 * + empty returns the content untouched, so the Story section hides itself.
 */
export function resolveStoryContent(
  content: StoryContent | undefined,
  defaults: TemplateContentDefaults,
  isDraft: boolean,
): StoryContent | undefined {
  if (storyHasBody(content)) return content;
  if (isDraft && (defaults.story?.paragraphs?.length ?? 0) > 0) {
    return {
      ...content,
      title: content?.title ?? defaults.story?.title ?? "Our Story",
      paragraphs: defaults.story?.paragraphs ?? [],
    };
  }
  return content;
}

/** Effective welcome content — default message on draft only. */
export function resolveWelcomeContent(
  content: WelcomeContent | undefined,
  defaults: TemplateContentDefaults,
  isDraft: boolean,
): WelcomeContent | undefined {
  if (content?.message?.trim()) return content;
  if (isDraft && defaults.welcome?.message) {
    return {
      ...content,
      title: content?.title ?? defaults.welcome.title,
      message: defaults.welcome.message,
    };
  }
  return content;
}

/** Effective hero content — default location on draft only. */
export function resolveHeroContent(
  content: HeroContent | undefined,
  defaults: TemplateContentDefaults,
  isDraft: boolean,
): HeroContent | undefined {
  if (content?.location?.trim()) return content;
  if (isDraft && defaults.hero?.location) {
    return {
      ...content,
      // HeroContent.title has no default in TemplateContentDefaults
      title: content?.title ?? "",
      location: defaults.hero.location,
    };
  }
  return content;
}
