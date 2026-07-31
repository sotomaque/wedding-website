import { describe, expect, it } from "bun:test";
import { buildSystemPrompt } from "@/lib/ai/prompts/base";
import { type ChatStats, systemPrompt } from "@/lib/ai/prompts/chat";
import type { WeddingContext } from "@/lib/db/wedding-context";

// A wedding date relative to "now" so the "days from now" assertion never
// expires — a hardcoded date turned into a time bomb the day after the real
// wedding passed (the prompt switched to "date has passed" and the test broke).
const FUTURE_WEDDING = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const baseCtx: WeddingContext = {
  weddingId: "w-1",
  slug: "alice-and-bob",
  coupleName: "Alice & Bob",
  weddingDate: FUTURE_WEDDING,
  rsvpDeadline: "2026-06-15",
  timezone: "America/New_York",
  status: "published",
  person1Name: "Alice",
  person2Name: "Bob",
  featureToggles: {
    hotels: true,
    registry: true,
    vendors: false,
    guestPhotos: true,
  },
};

describe("buildSystemPrompt", () => {
  it("includes couple name and timezone", () => {
    const prompt = buildSystemPrompt(baseCtx, "test instructions");
    expect(prompt).toContain("Alice & Bob");
    expect(prompt).toContain("America/New_York");
  });

  it("includes person1 and person2 names with side inference hint", () => {
    const prompt = buildSystemPrompt(baseCtx, "test");
    expect(prompt).toContain("Alice and Bob");
    expect(prompt).toContain("my friend");
    expect(prompt).toContain("bride/groom");
  });

  it("includes days until wedding", () => {
    const prompt = buildSystemPrompt(baseCtx, "test");
    expect(prompt).toMatch(/\d+ days from now/);
  });

  it("shows 'date has passed' for past weddings", () => {
    const pastCtx = { ...baseCtx, weddingDate: new Date("2020-01-01") };
    const prompt = buildSystemPrompt(pastCtx, "test");
    expect(prompt).toContain("date has passed");
  });

  it("includes RSVP deadline when set", () => {
    const prompt = buildSystemPrompt(baseCtx, "test");
    expect(prompt).toContain("2026-06-15");
  });

  it("omits RSVP deadline when null", () => {
    const noDeadline = { ...baseCtx, rsvpDeadline: null };
    const prompt = buildSystemPrompt(noDeadline, "test");
    expect(prompt).not.toContain("RSVP deadline");
  });

  it("lists only enabled features", () => {
    const prompt = buildSystemPrompt(baseCtx, "test");
    expect(prompt).toContain("hotels");
    expect(prompt).toContain("registry");
    expect(prompt).toContain("guestPhotos");
    expect(prompt).not.toContain("vendors");
  });

  it("omits features line when none enabled", () => {
    const noFeatures = { ...baseCtx, featureToggles: {} };
    const prompt = buildSystemPrompt(noFeatures, "test");
    expect(prompt).not.toContain("Enabled features");
  });

  it("omits couple identity when person names are null", () => {
    const noPeople = {
      ...baseCtx,
      person1Name: null,
      person2Name: null,
    };
    const prompt = buildSystemPrompt(noPeople, "test");
    expect(prompt).not.toContain("The couple:");
  });

  it("includes feature instructions", () => {
    const prompt = buildSystemPrompt(baseCtx, "Do the special thing");
    expect(prompt).toContain("Do the special thing");
  });

  it("includes extras when provided", () => {
    const prompt = buildSystemPrompt(baseCtx, "test", "Extra context here");
    expect(prompt).toContain("Extra context here");
  });

  it("omits extras section when not provided", () => {
    const prompt = buildSystemPrompt(baseCtx, "test");
    // Should end with the feature instructions, no trailing extras
    const lines = prompt.split("\n").filter(Boolean);
    expect(lines[lines.length - 1]).toBe("test");
  });
});

describe("chat systemPrompt", () => {
  it("includes stats snapshot when provided", () => {
    const stats: ChatStats = {
      totalGuests: 150,
      attending: 80,
      declined: 10,
      pending: 60,
      totalGifts: 5,
      totalGiftAmountCents: 50000,
    };

    const prompt = systemPrompt(baseCtx, stats);
    expect(prompt).toContain("Total guests: 150");
    expect(prompt).toContain("80 attending");
    expect(prompt).toContain("10 declined");
    expect(prompt).toContain("60 pending");
    expect(prompt).toContain("$500.00");
  });

  it("works without stats", () => {
    const prompt = systemPrompt(baseCtx);
    expect(prompt).toContain("Alice & Bob");
    expect(prompt).not.toContain("Current snapshot");
  });

  it("includes write tool confirmation rules", () => {
    const prompt = systemPrompt(baseCtx);
    expect(prompt).toContain("createGuest");
    expect(prompt).toContain("deleteGuest");
    expect(prompt).toContain("ALWAYS confirm");
    expect(prompt).toContain("bulkInvite");
  });
});
