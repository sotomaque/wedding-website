import { describe, expect, it } from "bun:test";
import {
  getTemplateContentDefaults,
  TEMPLATE_CONTENT_DEFAULTS,
} from "@/lib/template-content-defaults";
import { TEMPLATE_PRESETS } from "@/lib/templates";

describe("getTemplateContentDefaults", () => {
  it("returns classic defaults for the classic flavor", () => {
    const d = getTemplateContentDefaults("classic");
    expect(d.story?.paragraphs?.length ?? 0).toBeGreaterThan(0);
    expect(d.welcome?.message).toBeTruthy();
    expect(d.hero?.location).toBeTruthy();
  });

  it("returns elegant defaults for the elegant flavor", () => {
    const d = getTemplateContentDefaults("elegant");
    expect(d.story?.paragraphs?.length ?? 0).toBeGreaterThan(0);
    expect(d.welcome?.message).toBeTruthy();
  });

  it("falls back to classic for unknown/null/undefined flavors", () => {
    const classic = TEMPLATE_CONTENT_DEFAULTS.classic;
    expect(getTemplateContentDefaults("nope")).toBe(classic);
    expect(getTemplateContentDefaults(null)).toBe(classic);
    expect(getTemplateContentDefaults(undefined)).toBe(classic);
  });

  it("defines defaults for every seedFlavor used by a template preset", () => {
    for (const preset of TEMPLATE_PRESETS) {
      expect(TEMPLATE_CONTENT_DEFAULTS[preset.seedFlavor]).toBeDefined();
    }
  });
});
