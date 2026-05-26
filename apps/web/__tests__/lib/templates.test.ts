import { describe, expect, it } from "bun:test";
import { FONT_PAIRINGS } from "@/lib/fonts";
import { LAYOUT_PRESETS } from "@/lib/layouts";
import { MOTIF_PACKS } from "@/lib/motifs";
import { getTemplatePreset, TEMPLATE_PRESETS } from "@/lib/templates";
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
    expect(getTemplatePreset("lovebird-elegant").id).toBe("lovebird-elegant");
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

  it("lovebird-elegant preset is wired to its matching layout/theme/font entries", () => {
    const lovebird = getTemplatePreset("lovebird-elegant");
    expect(lovebird.layoutId).toBe("lovebird-elegant");
    expect(lovebird.defaultThemeId).toBe("lovebird-elegant");
    expect(lovebird.defaultFontId).toBe("lovebird-elegant");
    expect(lovebird.heroDisplay).toBe("couple-names");
    expect(lovebird.scheduleStyle).toBe("events-card");
    expect(lovebird.storyStyle).toBe("prose-only");
  });
});
