import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("@/lib/db/wedding-context", () => ({
  getWeddingContext: mock(() =>
    Promise.resolve({ weddingId: "w1", slug: "demo" }),
  ),
  getWeddingId: mock(() => Promise.resolve("w1")),
}));

const mockWeddingFindUnique = mock((_args?: unknown) =>
  Promise.resolve({ onboardingDismissed: false }),
);
const mockPlacementCount = mock(() => Promise.resolve(0));
const mockGuestCount = mock(() => Promise.resolve(0));
const mockRegistryCount = mock(() => Promise.resolve(0));

mock.module("@/lib/db", () => ({
  db: {
    wedding: { findUnique: mockWeddingFindUnique },
    photoPlacement: { count: mockPlacementCount },
    guest: { count: mockGuestCount },
    registryItem: { count: mockRegistryCount },
  },
}));

const mockSettings = mock(() => Promise.resolve({ rsvpDeadline: null }));
const mockContent = mock(() => Promise.resolve({}));
const mockVenues = mock(() =>
  Promise.resolve({ ceremony: undefined, reception: undefined }),
);

mock.module("@/lib/db/wedding-content-data", () => ({
  getWeddingSettings: mockSettings,
  getWeddingContentSections: mockContent,
  getCeremonyAndReception: mockVenues,
}));

function done(items: { id: string; done: boolean }[], id: string) {
  return items.find((i) => i.id === id)?.done;
}

describe("getOnboardingChecklistState", () => {
  beforeEach(() => {
    mockWeddingFindUnique.mockResolvedValue({ onboardingDismissed: false });
    mockPlacementCount.mockResolvedValue(0);
    mockGuestCount.mockResolvedValue(0);
    mockRegistryCount.mockResolvedValue(0);
    mockSettings.mockResolvedValue({ rsvpDeadline: null });
    mockContent.mockResolvedValue({});
    mockVenues.mockResolvedValue({ ceremony: undefined, reception: undefined });
  });

  it("is all-undone for a fresh wedding", async () => {
    const { getOnboardingChecklistState } = await import(
      "@/lib/onboarding-checklist"
    );
    const s = await getOnboardingChecklistState();
    expect(s.total).toBe(6);
    expect(s.doneCount).toBe(0);
    expect(s.allDone).toBe(false);
    expect(s.dismissed).toBe(false);
    expect(s.items.every((i) => !i.done)).toBe(true);
  });

  it("completes 'photos' when a placement exists", async () => {
    mockPlacementCount.mockResolvedValue(2);
    const { getOnboardingChecklistState } = await import(
      "@/lib/onboarding-checklist"
    );
    const s = await getOnboardingChecklistState();
    expect(done(s.items, "photos")).toBe(true);
    expect(s.doneCount).toBe(1);
  });

  it("completes 'guests' when a guest exists", async () => {
    mockGuestCount.mockResolvedValue(5);
    const { getOnboardingChecklistState } = await import(
      "@/lib/onboarding-checklist"
    );
    const s = await getOnboardingChecklistState();
    expect(done(s.items, "guests")).toBe(true);
  });

  it("completes 'venue' when an event has a venue", async () => {
    mockVenues.mockResolvedValue({
      ceremony: { title: "Wedding Ceremony", venue: "St. Mary's" },
      reception: undefined,
    });
    const { getOnboardingChecklistState } = await import(
      "@/lib/onboarding-checklist"
    );
    const s = await getOnboardingChecklistState();
    expect(done(s.items, "venue")).toBe(true);
  });

  it("completes 'rsvp' when a deadline is set", async () => {
    mockSettings.mockResolvedValue({ rsvpDeadline: "June 1st, 2026" });
    const { getOnboardingChecklistState } = await import(
      "@/lib/onboarding-checklist"
    );
    const s = await getOnboardingChecklistState();
    expect(done(s.items, "rsvp")).toBe(true);
  });

  it("completes 'story' via paragraphs OR bodyHtml, but not when empty", async () => {
    const { getOnboardingChecklistState } = await import(
      "@/lib/onboarding-checklist"
    );

    mockContent.mockResolvedValue({
      story: { paragraphs: ["We met in 2020."] },
    });
    expect(done((await getOnboardingChecklistState()).items, "story")).toBe(
      true,
    );

    mockContent.mockResolvedValue({
      story: { paragraphs: [], bodyHtml: "<p>hi</p>" },
    });
    expect(done((await getOnboardingChecklistState()).items, "story")).toBe(
      true,
    );

    // Empty default (seeded paragraphs []) should NOT count as done.
    mockContent.mockResolvedValue({ story: { paragraphs: [], bodyHtml: "" } });
    expect(done((await getOnboardingChecklistState()).items, "story")).toBe(
      false,
    );
  });

  it("is allDone only when every signal is present", async () => {
    mockPlacementCount.mockResolvedValue(3);
    mockGuestCount.mockResolvedValue(10);
    mockRegistryCount.mockResolvedValue(1);
    mockVenues.mockResolvedValue({
      ceremony: { title: "Ceremony", venue: "X" },
      reception: undefined,
    });
    mockContent.mockResolvedValue({ story: { paragraphs: ["Our story."] } });
    mockSettings.mockResolvedValue({ rsvpDeadline: "June 1" });
    const { getOnboardingChecklistState } = await import(
      "@/lib/onboarding-checklist"
    );
    const s = await getOnboardingChecklistState();
    expect(s.doneCount).toBe(6);
    expect(s.allDone).toBe(true);
  });

  it("surfaces the persisted dismissed flag", async () => {
    mockWeddingFindUnique.mockResolvedValue({ onboardingDismissed: true });
    const { getOnboardingChecklistState } = await import(
      "@/lib/onboarding-checklist"
    );
    expect((await getOnboardingChecklistState()).dismissed).toBe(true);
  });
});
