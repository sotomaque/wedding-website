/**
 * Per-wedding home-page layout templates.
 *
 * A layout preset controls the order (and presence) of the home-page
 * sections plus the navigation style. The selected preset drives the
 * section registry in app/[slug]/page.tsx and the `variant` prop on the
 * navigation. An unset selection falls back to "classic", which reproduces
 * the original hard-coded order + centered nav exactly.
 */

import type { NavVariant } from "@workspace/ui/components/navigation";

export type SectionKey =
  | "hero"
  | "story"
  | "details"
  | "schedule"
  | "rsvp"
  // Elegant-style sections — wired into the home-page section map as
  // placeholders/teasers in Phase 1; their backing components / data models
  // ship in Phase 2 (teasers) and Phase 3 (new feature CRUD).
  | "welcome"
  | "wedding-party"
  | "gallery"
  | "things-to-do"
  | "travel-teaser"
  | "registry-teaser"
  | "faqs";

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  /** Ordered list of home-page sections to render. */
  sections: SectionKey[];
  /** Navigation style for this layout. */
  navVariant: NavVariant;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "classic",
    name: "Classic",
    description:
      "Centered navigation with the timeless flow: hero, story, details, schedule, RSVP",
    sections: ["hero", "story", "details", "schedule", "rsvp"],
    navVariant: "centered",
  },
  {
    id: "modern",
    name: "Modern",
    description:
      "Left-aligned navigation that leads with the essentials before your story",
    sections: ["hero", "details", "schedule", "story", "rsvp"],
    navVariant: "left-aligned",
  },
  {
    id: "minimal",
    name: "Minimal",
    description:
      "Stripped-back, centered navigation focused on hero, story, and RSVP",
    sections: ["hero", "story", "rsvp"],
    navVariant: "minimal",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Full eleven-section flow for the Elegant template",
    sections: [
      "hero",
      "welcome",
      "story",
      "schedule",
      "wedding-party",
      "travel-teaser",
      "things-to-do",
      "gallery",
      "registry-teaser",
      "faqs",
      "rsvp",
    ],
    navVariant: "centered",
  },
];

const DEFAULT_LAYOUT = LAYOUT_PRESETS[0] as LayoutPreset;

/**
 * Get a layout preset by ID. Returns the default (classic) if not found.
 */
export function getLayoutPreset(
  layoutId: string | null | undefined,
): LayoutPreset {
  if (!layoutId) return DEFAULT_LAYOUT;
  return LAYOUT_PRESETS.find((l) => l.id === layoutId) ?? DEFAULT_LAYOUT;
}
