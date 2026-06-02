/**
 * Per-wedding font pairings.
 *
 * Each pairing maps a heading font + body font to the CSS variables that
 * next/font exposes (all curated fonts are statically loaded once in the
 * root layout — next/font cannot load fonts per request). The selected
 * pairing is injected as `--font-heading` / `--font-body` overrides into the
 * [slug]/layout.tsx wrapper; the @theme tokens in globals.css read those
 * with fallbacks, so an unset pairing keeps the default appearance
 * (serif headings + Geist body).
 */

export interface FontPairing {
  id: string;
  name: string;
  description: string;
  /**
   * CSS variable (set on <body> by next/font) used for headings.
   * Empty string means "use the site default serif stack".
   */
  headingVar: string;
  /**
   * CSS variable used for body text.
   * Empty string means "use the site default (Geist)".
   */
  bodyVar: string;
  /**
   * Optional CSS variable for UI chrome (buttons, nav, form controls) when the
   * template wants a third font distinct from body prose. Empty/undefined
   * means "inherit body font" — preserves existing pairing behavior.
   */
  uiVar?: string;
  /**
   * Optional CSS variable for display-only text (hero couple-names, section
   * h2 titles) when the pairing uses a script/decorative font that only
   * reads well at very large sizes. Empty/undefined means "use the heading
   * font" — so existing pairings keep the current behavior where the section
   * title font equals the general heading font.
   */
  displayVar?: string;
  /** font-family values for inline preview swatches in the admin UI. */
  preview: { heading: string; body: string };
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Timeless serif headings with a clean sans body — the default",
    headingVar: "",
    bodyVar: "",
    preview: {
      heading: "Georgia, 'Times New Roman', serif",
      body: "system-ui, sans-serif",
    },
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Dramatic Playfair Display headings paired with readable Lora",
    headingVar: "--font-playfair",
    bodyVar: "--font-lora",
    preview: { heading: "'Playfair Display', serif", body: "'Lora', serif" },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Crisp Montserrat throughout — clean and contemporary",
    headingVar: "--font-montserrat",
    bodyVar: "--font-montserrat",
    preview: {
      heading: "'Montserrat', sans-serif",
      body: "'Montserrat', sans-serif",
    },
  },
  {
    id: "romantic",
    name: "Romantic",
    description: "Airy Cormorant Garamond headings over a tidy Montserrat body",
    headingVar: "--font-cormorant",
    bodyVar: "--font-montserrat",
    preview: {
      heading: "'Cormorant Garamond', serif",
      body: "'Montserrat', sans-serif",
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Warm Lora headings with the default Geist body",
    headingVar: "--font-lora",
    bodyVar: "",
    preview: { heading: "'Lora', serif", body: "system-ui, sans-serif" },
  },
  {
    id: "elegant-script",
    name: "Elegant Script",
    description:
      "Sacramento script display, Quicksand body, Inter UI — the Elegant template's trio",
    // Ground truth from the actual Elegant capture (computed style on <p>):
    //   font-family: "Quicksand", sans-serif;
    // Body prose AND subsection headings use Quicksand — a rounded, friendly
    // sans that carries well at small sizes where Sacramento becomes
    // unreadable. Sacramento is reserved for display (section h2 titles +
    // hero couple-names) via the separate displayVar slot.
    headingVar: "--font-quicksand",
    bodyVar: "--font-quicksand",
    uiVar: "--font-inter",
    displayVar: "--font-sacramento",
    preview: {
      heading: "'Sacramento', cursive",
      body: "'Quicksand', sans-serif",
    },
  },
];

const DEFAULT_FONT = FONT_PAIRINGS[0] as FontPairing;

/**
 * Get a font pairing by ID. Returns the default (classic) if not found.
 */
export function getFontPairing(fontId: string | null | undefined): FontPairing {
  if (!fontId) return DEFAULT_FONT;
  return FONT_PAIRINGS.find((f) => f.id === fontId) ?? DEFAULT_FONT;
}

/** Whether `id` corresponds to a real font pairing. Use to validate
 *  user-supplied IDs at the server-action boundary before writing. */
export function isValidFontId(id: string): boolean {
  return FONT_PAIRINGS.some((f) => f.id === id);
}

/**
 * Generate inline CSS overriding the `--font-heading` / `--font-body`
 * indirection tokens for a pairing. Returns "" for the default pairing
 * (no overrides) so existing weddings render identically.
 *
 * Targets the `body` selector (not `:root`) because the per-font variables
 * (e.g. --font-lora) are declared on <body> by next/font. Referencing them
 * from `:root` would resolve to the guaranteed-invalid value; from `body`
 * they resolve correctly and inherit to all descendants.
 */
export function generateFontCss(pairing: FontPairing): string {
  const decls: string[] = [];
  if (pairing.headingVar) {
    decls.push(`--font-heading: var(${pairing.headingVar});`);
  }
  if (pairing.bodyVar) {
    decls.push(`--font-body: var(${pairing.bodyVar});`);
  }
  if (pairing.uiVar) {
    decls.push(`--font-ui-text: var(${pairing.uiVar});`);
  }
  if (pairing.displayVar) {
    decls.push(`--font-display-text: var(${pairing.displayVar});`);
  }
  if (decls.length === 0) return "";
  return `body { ${decls.join(" ")} }`;
}
