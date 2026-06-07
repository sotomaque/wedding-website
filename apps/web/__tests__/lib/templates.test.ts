import { describe, expect, it } from "bun:test";
import { FONT_PAIRINGS } from "@/lib/fonts";
import { LAYOUT_PRESETS } from "@/lib/layouts";
import { MOTIF_PACKS } from "@/lib/motifs";
import {
  getEffectiveFontId,
  getEffectiveThemeId,
  getPhotoSections,
  getTemplatePreset,
  TEMPLATE_PRESETS,
} from "@/lib/templates";
import { THEME_PRESETS } from "@/lib/themes";

describe("getTemplatePreset", () => {
  it("returns the classic default for null/undefined", () => {
    expect(getTemplatePreset(null).id).toBe("classic");
    expect(getTemplatePreset(undefined).id).toBe("classic");
  });

  it("returns the classic default for an unknown id", () => {
    expect(getTemplatePreset("nope").id).toBe("classic");
  });

  it("returns the matching preset by id", () => {
    expect(getTemplatePreset("elegant").id).toBe("elegant");
  });

  it("uses 'classic' as the first preset (so null falls back to production look)", () => {
    expect(TEMPLATE_PRESETS[0]?.id).toBe("classic");
  });
});

describe("TEMPLATE_PRESETS", () => {
  it("has unique ids", () => {
    const ids = TEMPLATE_PRESETS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template references a known layout, motif, theme, and font", () => {
    const layoutIds = new Set(LAYOUT_PRESETS.map((l) => l.id));
    const motifIds = new Set(MOTIF_PACKS.map((m) => m.id));
    const themeIds = new Set(THEME_PRESETS.map((t) => t.id));
    const fontIds = new Set(FONT_PAIRINGS.map((f) => f.id));

    for (const template of TEMPLATE_PRESETS) {
      expect(layoutIds.has(template.layoutId)).toBe(true);
      expect(motifIds.has(template.motifId)).toBe(true);
      expect(themeIds.has(template.defaultThemeId)).toBe(true);
      expect(fontIds.has(template.defaultFontId)).toBe(true);
    }
  });

  it("every template declares a valid heroDisplay mode", () => {
    for (const template of TEMPLATE_PRESETS) {
      expect(["title", "couple-names"]).toContain(template.heroDisplay);
    }
  });

  it("every template declares valid section variant discriminators", () => {
    for (const template of TEMPLATE_PRESETS) {
      expect(["timeline", "events-card"]).toContain(template.scheduleStyle);
      expect(["photo-grid", "prose-only"]).toContain(template.storyStyle);
    }
  });

  it("classic preset captures the production look (warm-gold + classic font)", () => {
    const classic = getTemplatePreset("classic");
    expect(classic.layoutId).toBe("classic");
    expect(classic.motifId).toBe("none");
    expect(classic.defaultThemeId).toBe("warm-gold");
    expect(classic.defaultFontId).toBe("classic");
    expect(classic.heroDisplay).toBe("title");
    expect(classic.scheduleStyle).toBe("timeline");
    expect(classic.storyStyle).toBe("photo-grid");
  });

  it("elegant preset is wired to its matching layout/theme/font entries", () => {
    const elegant = getTemplatePreset("elegant");
    expect(elegant.layoutId).toBe("elegant");
    expect(elegant.defaultThemeId).toBe("elegant");
    expect(elegant.defaultFontId).toBe("elegant-script");
    expect(elegant.heroDisplay).toBe("couple-names");
    expect(elegant.scheduleStyle).toBe("events-card");
    expect(elegant.storyStyle).toBe("prose-only");
  });
});

describe("getEffectiveFontId / getEffectiveThemeId (resolve-on-read)", () => {
  const elegant = getTemplatePreset("elegant");
  const classic = getTemplatePreset("classic");

  it("inherits the template default font when the user has no override", () => {
    // The reported bug: an Elegant wedding with no font override rendered
    // elegant-script but the picker highlighted classic. Null must resolve
    // to the *template* default, never a hardcoded classic.
    expect(getEffectiveFontId(elegant, null)).toBe("elegant-script");
    expect(getEffectiveFontId(elegant, undefined)).toBe("elegant-script");
    expect(getEffectiveFontId(classic, null)).toBe("classic");
  });

  it("lets a user font override win over the template default", () => {
    expect(getEffectiveFontId(elegant, "modern")).toBe("modern");
    expect(getEffectiveFontId(classic, "elegant")).toBe("elegant");
  });

  it("inherits the template default theme when the user has no override", () => {
    expect(getEffectiveThemeId(elegant, null)).toBe("elegant");
    expect(getEffectiveThemeId(elegant, undefined)).toBe("elegant");
    expect(getEffectiveThemeId(classic, null)).toBe("warm-gold");
  });

  it("lets a user theme override win over the template default", () => {
    expect(getEffectiveThemeId(elegant, "warm-gold")).toBe("warm-gold");
  });
});

describe("getPhotoSections", () => {
  it("classic renders hero + story (its layout has no gallery)", () => {
    expect(getPhotoSections(getTemplatePreset("classic"))).toEqual([
      "hero",
      "story",
    ]);
  });

  it("elegant renders hero + gallery (story is prose-only)", () => {
    expect(getPhotoSections(getTemplatePreset("elegant"))).toEqual([
      "hero",
      "gallery",
    ]);
  });

  it("excludes story when the template's story variant is prose-only", () => {
    for (const template of TEMPLATE_PRESETS) {
      const sections = getPhotoSections(template);
      if (template.storyStyle === "prose-only") {
        expect(sections).not.toContain("story");
      }
    }
  });

  it("only ever returns photo-capable sections", () => {
    for (const template of TEMPLATE_PRESETS) {
      for (const section of getPhotoSections(template)) {
        expect(["hero", "story", "gallery"]).toContain(section);
      }
    }
  });
});
