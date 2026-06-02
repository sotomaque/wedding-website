import { describe, expect, it } from "bun:test";
import { generateThemeCss, getThemePreset, THEME_PRESETS } from "@/lib/themes";

describe("getThemePreset", () => {
  it("returns warm-gold default for null/undefined", () => {
    expect(getThemePreset(null).id).toBe("warm-gold");
    expect(getThemePreset(undefined).id).toBe("warm-gold");
  });

  it("returns warm-gold for an unknown id", () => {
    expect(getThemePreset("rainbow").id).toBe("warm-gold");
  });

  it("returns newly added presets by id", () => {
    expect(getThemePreset("lavender-fields").id).toBe("lavender-fields");
    expect(getThemePreset("coastal-blue").id).toBe("coastal-blue");
    expect(getThemePreset("burgundy-wine").id).toBe("burgundy-wine");
    expect(getThemePreset("emerald-forest").id).toBe("emerald-forest");
    expect(getThemePreset("elegant").id).toBe("elegant");
  });
});

describe("THEME_PRESETS", () => {
  it("has unique ids", () => {
    const ids = THEME_PRESETS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every preset has valid hex preview swatches", () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const theme of THEME_PRESETS) {
      expect(theme.preview.primary).toMatch(hex);
      expect(theme.preview.accent).toMatch(hex);
      expect(theme.preview.background).toMatch(hex);
    }
  });
});

describe("generateThemeCss", () => {
  it("is a no-op for the default warm-gold theme", () => {
    expect(generateThemeCss(getThemePreset("warm-gold"))).toBe("");
  });

  it("emits :root:not(.dark) overrides for a custom theme", () => {
    const css = generateThemeCss(getThemePreset("emerald-forest"));
    expect(css).toContain(":root:not(.dark)");
    expect(css).toContain("--primary:");
  });
});
