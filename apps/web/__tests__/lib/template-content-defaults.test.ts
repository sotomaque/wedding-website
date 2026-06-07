import { describe, expect, it } from "bun:test";
import {
  getTemplateContentDefaults,
  resolveHeroContent,
  resolveStoryContent,
  resolveWelcomeContent,
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

describe("resolveStoryContent", () => {
  const defaults = getTemplateContentDefaults("elegant");

  it("returns content unchanged when it already has paragraphs", () => {
    const content = { title: "Us", paragraphs: ["real"] };
    expect(resolveStoryContent(content, defaults, true)).toBe(content);
  });

  it("returns content unchanged when it already has bodyHtml", () => {
    const content = { title: "Us", paragraphs: [], bodyHtml: "<p>real</p>" };
    expect(resolveStoryContent(content, defaults, true)).toBe(content);
  });

  it("injects default paragraphs when empty and draft", () => {
    const resolved = resolveStoryContent(
      { title: "Us", paragraphs: [] },
      defaults,
      true,
    );
    expect(resolved?.paragraphs.length).toBeGreaterThan(0);
    expect(resolved?.title).toBe("Us"); // keeps the user's title
  });

  it("does NOT inject when empty and published", () => {
    const content = { title: "Us", paragraphs: [] };
    expect(resolveStoryContent(content, defaults, false)).toBe(content);
  });

  it("uses the default title when content has none", () => {
    const resolved = resolveStoryContent(undefined, defaults, true);
    expect(resolved?.title).toBe("Our Story");
  });
});

describe("resolveWelcomeContent", () => {
  const defaults = getTemplateContentDefaults("elegant");

  it("returns content unchanged when it has a non-empty message", () => {
    const content = { title: "Hi", message: "real" };
    expect(resolveWelcomeContent(content, defaults, true)).toBe(content);
  });

  it("injects the default message when empty and draft", () => {
    const resolved = resolveWelcomeContent(
      { title: "Hi", message: "  " },
      defaults,
      true,
    );
    expect(resolved?.message).toBe(defaults.welcome?.message);
  });

  it("does NOT inject when empty and published", () => {
    const content = { title: "Hi", message: "" };
    expect(resolveWelcomeContent(content, defaults, false)).toBe(content);
  });

  it("returns undefined when content is undefined and published", () => {
    expect(resolveWelcomeContent(undefined, defaults, false)).toBeUndefined();
  });
});

describe("resolveHeroContent", () => {
  const defaults = getTemplateContentDefaults("elegant");

  it("keeps a user-provided location", () => {
    const content = { title: "T", location: "Paris" };
    expect(resolveHeroContent(content, defaults, true)).toBe(content);
  });

  it("injects the default location when empty and draft", () => {
    const resolved = resolveHeroContent({ title: "T" }, defaults, true);
    expect(resolved?.location).toBe(defaults.hero?.location);
  });

  it("treats a whitespace-only location as empty (injects on draft)", () => {
    const resolved = resolveHeroContent(
      { title: "T", location: "  " },
      defaults,
      true,
    );
    expect(resolved?.location).toBe(defaults.hero?.location);
  });

  it("does NOT inject when empty and published", () => {
    const content = { title: "T" };
    expect(resolveHeroContent(content, defaults, false)).toBe(content);
  });

  it("returns undefined when content is undefined and published", () => {
    expect(resolveHeroContent(undefined, defaults, false)).toBeUndefined();
  });
});
