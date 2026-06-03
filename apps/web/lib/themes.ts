/**
 * Per-wedding theme presets.
 *
 * Each preset defines CSS custom property overrides in OKLch color space
 * that replace the default globals.css values when injected into the
 * [slug]/layout.tsx wrapper.
 *
 * Only the variables that differ from the default are specified.
 * Unspecified variables fall through to globals.css.
 */

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  preview: {
    primary: string; // hex for UI preview swatches
    accent: string;
    background: string;
  };
  cssVariables: Record<string, string>;
  darkCssVariables?: Record<string, string>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "warm-gold",
    name: "Warm Gold",
    description: "Classic warm gold and cream — elegant and timeless",
    preview: { primary: "#b8860b", accent: "#daa520", background: "#faf5ef" },
    cssVariables: {
      // This is the default theme — no overrides needed
    },
  },
  {
    id: "sage-garden",
    name: "Sage Garden",
    description: "Soft sage green with warm neutrals — natural and earthy",
    preview: { primary: "#6b7f5e", accent: "#8fae7e", background: "#f5f7f2" },
    cssVariables: {
      "--background": "oklch(0.97 0.01 140)",
      "--foreground": "oklch(0.22 0.02 150)",
      "--card": "oklch(0.98 0.008 140)",
      "--card-foreground": "oklch(0.22 0.02 150)",
      "--popover": "oklch(0.98 0.008 140)",
      "--popover-foreground": "oklch(0.22 0.02 150)",
      "--primary": "oklch(0.5 0.1 145)",
      "--primary-foreground": "oklch(0.98 0.005 140)",
      "--secondary": "oklch(0.93 0.015 140)",
      "--secondary-foreground": "oklch(0.28 0.02 150)",
      "--muted": "oklch(0.94 0.01 140)",
      "--muted-foreground": "oklch(0.45 0.015 145)",
      "--accent": "oklch(0.65 0.12 145)",
      "--accent-foreground": "oklch(0.15 0.01 150)",
      "--border": "oklch(0.88 0.012 140)",
      "--input": "oklch(0.88 0.012 140)",
      "--ring": "oklch(0.5 0.1 145)",
    },
  },
  {
    id: "dusty-rose",
    name: "Dusty Rose",
    description: "Romantic dusty rose with blush tones — soft and feminine",
    preview: { primary: "#b76e79", accent: "#d4a0a7", background: "#fdf5f6" },
    cssVariables: {
      "--background": "oklch(0.97 0.012 10)",
      "--foreground": "oklch(0.22 0.02 350)",
      "--card": "oklch(0.99 0.006 10)",
      "--card-foreground": "oklch(0.22 0.02 350)",
      "--popover": "oklch(0.99 0.006 10)",
      "--popover-foreground": "oklch(0.22 0.02 350)",
      "--primary": "oklch(0.55 0.1 10)",
      "--primary-foreground": "oklch(0.98 0.005 10)",
      "--secondary": "oklch(0.93 0.015 10)",
      "--secondary-foreground": "oklch(0.3 0.02 350)",
      "--muted": "oklch(0.94 0.01 10)",
      "--muted-foreground": "oklch(0.45 0.015 355)",
      "--accent": "oklch(0.7 0.1 10)",
      "--accent-foreground": "oklch(0.15 0.01 350)",
      "--border": "oklch(0.9 0.01 10)",
      "--input": "oklch(0.9 0.01 10)",
      "--ring": "oklch(0.55 0.1 10)",
    },
  },
  {
    id: "navy-classic",
    name: "Navy Classic",
    description: "Deep navy with silver accents — refined and traditional",
    preview: { primary: "#2c3e6b", accent: "#5b7bb3", background: "#f4f6fa" },
    cssVariables: {
      "--background": "oklch(0.97 0.008 250)",
      "--foreground": "oklch(0.2 0.03 250)",
      "--card": "oklch(0.99 0.004 250)",
      "--card-foreground": "oklch(0.2 0.03 250)",
      "--popover": "oklch(0.99 0.004 250)",
      "--popover-foreground": "oklch(0.2 0.03 250)",
      "--primary": "oklch(0.4 0.12 255)",
      "--primary-foreground": "oklch(0.98 0.004 250)",
      "--secondary": "oklch(0.93 0.01 250)",
      "--secondary-foreground": "oklch(0.25 0.03 250)",
      "--muted": "oklch(0.94 0.008 250)",
      "--muted-foreground": "oklch(0.45 0.02 250)",
      "--accent": "oklch(0.6 0.08 255)",
      "--accent-foreground": "oklch(0.12 0.02 250)",
      "--border": "oklch(0.88 0.008 250)",
      "--input": "oklch(0.88 0.008 250)",
      "--ring": "oklch(0.4 0.12 255)",
    },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    description: "Warm terracotta with sandy tones — bohemian and organic",
    preview: { primary: "#c4724b", accent: "#d9956e", background: "#faf6f2" },
    cssVariables: {
      "--background": "oklch(0.97 0.012 55)",
      "--foreground": "oklch(0.22 0.025 45)",
      "--card": "oklch(0.99 0.006 55)",
      "--card-foreground": "oklch(0.22 0.025 45)",
      "--popover": "oklch(0.99 0.006 55)",
      "--popover-foreground": "oklch(0.22 0.025 45)",
      "--primary": "oklch(0.55 0.14 45)",
      "--primary-foreground": "oklch(0.98 0.005 55)",
      "--secondary": "oklch(0.92 0.018 55)",
      "--secondary-foreground": "oklch(0.3 0.025 45)",
      "--muted": "oklch(0.94 0.012 55)",
      "--muted-foreground": "oklch(0.45 0.02 50)",
      "--accent": "oklch(0.68 0.12 50)",
      "--accent-foreground": "oklch(0.15 0.015 45)",
      "--border": "oklch(0.88 0.015 55)",
      "--input": "oklch(0.88 0.015 55)",
      "--ring": "oklch(0.55 0.14 45)",
    },
  },
  {
    id: "lavender-fields",
    name: "Lavender Fields",
    description: "Soft lavender with cool greys — delicate and dreamy",
    preview: { primary: "#7c6aa8", accent: "#a594c9", background: "#f7f5fb" },
    cssVariables: {
      "--background": "oklch(0.97 0.012 300)",
      "--foreground": "oklch(0.24 0.025 295)",
      "--card": "oklch(0.99 0.006 300)",
      "--card-foreground": "oklch(0.24 0.025 295)",
      "--popover": "oklch(0.99 0.006 300)",
      "--popover-foreground": "oklch(0.24 0.025 295)",
      "--primary": "oklch(0.52 0.11 300)",
      "--primary-foreground": "oklch(0.98 0.005 300)",
      "--secondary": "oklch(0.93 0.018 300)",
      "--secondary-foreground": "oklch(0.3 0.025 295)",
      "--muted": "oklch(0.94 0.012 300)",
      "--muted-foreground": "oklch(0.46 0.02 298)",
      "--accent": "oklch(0.68 0.1 300)",
      "--accent-foreground": "oklch(0.15 0.015 295)",
      "--border": "oklch(0.89 0.014 300)",
      "--input": "oklch(0.89 0.014 300)",
      "--ring": "oklch(0.52 0.11 300)",
    },
  },
  {
    id: "coastal-blue",
    name: "Coastal Blue",
    description: "Breezy seafoam and sky blue — fresh and airy",
    preview: { primary: "#3a8a99", accent: "#6bb6c4", background: "#f1f8f9" },
    cssVariables: {
      "--background": "oklch(0.97 0.012 210)",
      "--foreground": "oklch(0.23 0.025 220)",
      "--card": "oklch(0.99 0.006 210)",
      "--card-foreground": "oklch(0.23 0.025 220)",
      "--popover": "oklch(0.99 0.006 210)",
      "--popover-foreground": "oklch(0.23 0.025 220)",
      "--primary": "oklch(0.55 0.09 215)",
      "--primary-foreground": "oklch(0.98 0.005 210)",
      "--secondary": "oklch(0.93 0.016 205)",
      "--secondary-foreground": "oklch(0.3 0.025 220)",
      "--muted": "oklch(0.94 0.012 205)",
      "--muted-foreground": "oklch(0.46 0.02 215)",
      "--accent": "oklch(0.7 0.09 200)",
      "--accent-foreground": "oklch(0.15 0.015 220)",
      "--border": "oklch(0.89 0.014 208)",
      "--input": "oklch(0.89 0.014 208)",
      "--ring": "oklch(0.55 0.09 215)",
    },
  },
  {
    id: "burgundy-wine",
    name: "Burgundy Wine",
    description: "Rich burgundy with warm blush — bold and romantic",
    preview: { primary: "#8a2e3f", accent: "#b85c6b", background: "#fbf3f4" },
    cssVariables: {
      "--background": "oklch(0.97 0.012 15)",
      "--foreground": "oklch(0.22 0.03 20)",
      "--card": "oklch(0.99 0.006 15)",
      "--card-foreground": "oklch(0.22 0.03 20)",
      "--popover": "oklch(0.99 0.006 15)",
      "--popover-foreground": "oklch(0.22 0.03 20)",
      "--primary": "oklch(0.42 0.14 18)",
      "--primary-foreground": "oklch(0.98 0.005 15)",
      "--secondary": "oklch(0.93 0.018 15)",
      "--secondary-foreground": "oklch(0.28 0.03 20)",
      "--muted": "oklch(0.94 0.012 15)",
      "--muted-foreground": "oklch(0.45 0.025 18)",
      "--accent": "oklch(0.6 0.13 18)",
      "--accent-foreground": "oklch(0.98 0.005 15)",
      "--border": "oklch(0.89 0.014 15)",
      "--input": "oklch(0.89 0.014 15)",
      "--ring": "oklch(0.42 0.14 18)",
    },
  },
  {
    id: "emerald-forest",
    name: "Emerald Forest",
    description: "Deep emerald with gold — lush and luxurious",
    preview: { primary: "#1f6b52", accent: "#c9a14a", background: "#f2f7f4" },
    cssVariables: {
      "--background": "oklch(0.97 0.01 165)",
      "--foreground": "oklch(0.21 0.025 170)",
      "--card": "oklch(0.99 0.005 165)",
      "--card-foreground": "oklch(0.21 0.025 170)",
      "--popover": "oklch(0.99 0.005 165)",
      "--popover-foreground": "oklch(0.21 0.025 170)",
      "--primary": "oklch(0.44 0.1 165)",
      "--primary-foreground": "oklch(0.98 0.005 165)",
      "--secondary": "oklch(0.93 0.014 165)",
      "--secondary-foreground": "oklch(0.28 0.025 170)",
      "--muted": "oklch(0.94 0.01 165)",
      "--muted-foreground": "oklch(0.45 0.02 167)",
      "--accent": "oklch(0.72 0.11 90)",
      "--accent-foreground": "oklch(0.15 0.015 90)",
      "--border": "oklch(0.88 0.012 165)",
      "--input": "oklch(0.88 0.012 165)",
      "--ring": "oklch(0.44 0.1 165)",
    },
  },
  {
    id: "elegant",
    name: "Elegant",
    description:
      "Dark forest green with cream — the Elegant template's romantic look",
    // Ground-truth values from the Elegant site capture (.elegant-analysis):
    //   --background  = rgb(58, 68, 62)   "#3A443E" forest green (page-wide)
    //   --foreground  = rgb(246, 246, 250) "#F6F6FA" warm cream/white
    // Everything below derives from those two; OKLch keeps the green hue stable
    // across light/dark token slots and gives smooth tonal shifts for muted,
    // border, card surfaces, etc.
    preview: { primary: "#3A443E", accent: "#E5E2D5", background: "#3A443E" },
    cssVariables: {
      // Ground-truth values from the Elegant capture:
      //   background: rgb(58, 68, 62)   = #3A443E forest green
      //   foreground: rgb(229, 226, 213) = #E5E2D5 warm cream (NOT lavender)
      "--background": "oklch(0.27 0.013 155)",
      "--foreground": "oklch(0.90 0.018 85)",
      // Card / popover sit slightly lighter than the page so cards have lift
      // without losing the dark-on-dark palette.
      "--card": "oklch(0.31 0.013 155)",
      "--card-foreground": "oklch(0.90 0.018 85)",
      "--popover": "oklch(0.31 0.013 155)",
      "--popover-foreground": "oklch(0.90 0.018 85)",
      // Primary = cream — used by buttons. Elegant's CTA buttons are cream
      // outlined-on-dark; using cream as primary keeps tailwind utilities
      // (bg-primary / border-primary / text-primary) doing the right thing
      // for both filled and outlined variants.
      "--primary": "oklch(0.90 0.018 85)",
      "--primary-foreground": "oklch(0.27 0.013 155)",
      // Secondary = a touch warmer cream surface for inset blocks.
      "--secondary": "oklch(0.35 0.013 155)",
      "--secondary-foreground": "oklch(0.90 0.018 85)",
      "--muted": "oklch(0.34 0.013 155)",
      "--muted-foreground": "oklch(0.76 0.018 85)",
      "--accent": "oklch(0.85 0.07 80)",
      "--accent-foreground": "oklch(0.27 0.013 155)",
      "--border": "oklch(0.42 0.013 155)",
      "--input": "oklch(0.42 0.013 155)",
      "--ring": "oklch(0.90 0.018 85)",
    },
  },
];

/**
 * Get a theme preset by ID. Returns the default (warm-gold) if not found.
 */
const DEFAULT_THEME = THEME_PRESETS[0] as ThemePreset;

export function getThemePreset(
  themeId: string | null | undefined,
): ThemePreset {
  if (!themeId) return DEFAULT_THEME;
  return THEME_PRESETS.find((t) => t.id === themeId) ?? DEFAULT_THEME;
}

/**
 * Generate inline CSS string for a theme's custom property overrides.
 * Light variables use :root:not(.dark) so they don't override .dark from globals.css.
 * Dark variables use .dark if provided, otherwise globals.css dark theme is used.
 */
export function generateThemeCss(theme: ThemePreset): string {
  const lightEntries = Object.entries(theme.cssVariables);
  const darkEntries = Object.entries(theme.darkCssVariables ?? {});
  if (lightEntries.length === 0 && darkEntries.length === 0) return "";

  let css = "";
  if (lightEntries.length > 0) {
    css += `:root:not(.dark) { ${lightEntries.map(([key, value]) => `${key}: ${value};`).join("\n  ")} }`;
  }
  if (darkEntries.length > 0) {
    css += ` .dark { ${darkEntries.map(([key, value]) => `${key}: ${value};`).join("\n  ")} }`;
  }
  return css;
}
