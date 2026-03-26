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
