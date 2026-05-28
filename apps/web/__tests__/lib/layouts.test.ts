import { describe, expect, it } from "bun:test";
import {
  getLayoutPreset,
  LAYOUT_PRESETS,
  type SectionKey,
} from "@/lib/layouts";

const ALL_SECTIONS: SectionKey[] = [
  "hero",
  "story",
  "details",
  "schedule",
  "rsvp",
  "welcome",
  "wedding-party",
  "gallery",
  "things-to-do",
  "travel-teaser",
  "registry-teaser",
  "faqs",
];

describe("getLayoutPreset", () => {
  it("returns the classic default for null/undefined", () => {
    expect(getLayoutPreset(null).id).toBe("classic");
    expect(getLayoutPreset(undefined).id).toBe("classic");
  });

  it("returns the classic default for an unknown id", () => {
    expect(getLayoutPreset("nope").id).toBe("classic");
  });

  it("returns the matching preset by id", () => {
    expect(getLayoutPreset("minimal").id).toBe("minimal");
  });
});

describe("LAYOUT_PRESETS", () => {
  it("classic reproduces the original section order and centered nav", () => {
    const classic = getLayoutPreset("classic");
    expect(classic.sections).toEqual([
      "hero",
      "story",
      "details",
      "schedule",
      "rsvp",
    ]);
    expect(classic.navVariant).toBe("centered");
  });

  it("lovebird-elegant lists the full ten-section flow in order", () => {
    const lovebird = getLayoutPreset("lovebird-elegant");
    expect(lovebird.sections).toEqual([
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
    ]);
  });

  it("has unique ids", () => {
    const ids = LAYOUT_PRESETS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references known section keys", () => {
    for (const layout of LAYOUT_PRESETS) {
      for (const section of layout.sections) {
        expect(ALL_SECTIONS).toContain(section);
      }
    }
  });

  it("never lists a section more than once per layout", () => {
    for (const layout of LAYOUT_PRESETS) {
      expect(new Set(layout.sections).size).toBe(layout.sections.length);
    }
  });
});
