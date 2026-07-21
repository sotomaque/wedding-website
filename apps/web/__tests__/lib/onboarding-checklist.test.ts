import { describe, expect, it } from "bun:test";
import {
  buildOnboardingChecklist,
  type ChecklistSignals,
  storyHasText,
} from "@/lib/onboarding-checklist-core";

const ALL_FALSE: ChecklistSignals = {
  dismissed: false,
  hasPhotos: false,
  hasGuests: false,
  hasVenue: false,
  hasStory: false,
  hasRsvpDeadline: false,
  hasRegistry: false,
};

function done(
  state: ReturnType<typeof buildOnboardingChecklist>,
  id: string,
): boolean | undefined {
  return state.items.find((i) => i.id === id)?.done;
}

describe("buildOnboardingChecklist", () => {
  it("is all-undone for a fresh wedding", () => {
    const s = buildOnboardingChecklist("/demo/admin", ALL_FALSE);
    expect(s.total).toBe(6);
    expect(s.doneCount).toBe(0);
    expect(s.allDone).toBe(false);
    expect(s.dismissed).toBe(false);
    expect(s.items.every((i) => !i.done)).toBe(true);
  });

  it("maps each signal to its item", () => {
    const cases: [keyof ChecklistSignals, string][] = [
      ["hasPhotos", "photos"],
      ["hasGuests", "guests"],
      ["hasVenue", "venue"],
      ["hasStory", "story"],
      ["hasRsvpDeadline", "rsvp"],
      ["hasRegistry", "registry"],
    ];
    for (const [signal, id] of cases) {
      const s = buildOnboardingChecklist("/demo/admin", {
        ...ALL_FALSE,
        [signal]: true,
      });
      expect(done(s, id)).toBe(true);
      expect(s.doneCount).toBe(1);
    }
  });

  it("is allDone only when every signal is present", () => {
    const s = buildOnboardingChecklist("/demo/admin", {
      dismissed: false,
      hasPhotos: true,
      hasGuests: true,
      hasVenue: true,
      hasStory: true,
      hasRsvpDeadline: true,
      hasRegistry: true,
    });
    expect(s.doneCount).toBe(6);
    expect(s.allDone).toBe(true);
  });

  it("surfaces the dismissed flag and uses the base for hrefs", () => {
    const s = buildOnboardingChecklist("/helen/admin", {
      ...ALL_FALSE,
      dismissed: true,
    });
    expect(s.dismissed).toBe(true);
    expect(done(s, "photos")).toBe(false);
    expect(s.items.find((i) => i.id === "photos")?.href).toBe(
      "/helen/admin/photos",
    );
  });
});

describe("storyHasText", () => {
  it("is true when a non-empty paragraph exists", () => {
    expect(storyHasText({ paragraphs: ["We met in 2020."] })).toBe(true);
  });

  it("is true when bodyHtml has content", () => {
    expect(storyHasText({ paragraphs: [], bodyHtml: "<p>hi</p>" })).toBe(true);
  });

  it("is false for the empty seeded default", () => {
    expect(storyHasText({ paragraphs: [], bodyHtml: "" })).toBe(false);
    expect(storyHasText({ paragraphs: ["  "] })).toBe(false);
    expect(storyHasText(undefined)).toBe(false);
  });
});
