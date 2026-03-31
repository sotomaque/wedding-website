import { describe, expect, it } from "bun:test";
import {
  buildUserPrompt,
  type RsvpStats,
} from "@/lib/ai/prompts/rsvp-insights";

const baseStats: RsvpStats = {
  totalGuests: 150,
  attending: 80,
  declined: 10,
  pending: 60,
  invited: 120,
  uninvited: 30,
  byList: {
    a: { total: 80, attending: 50, pending: 20 },
    b: { total: 50, attending: 25, pending: 20 },
    c: { total: 20, attending: 5, pending: 15 },
  },
  bySide: {
    bride: { total: 70, attending: 40 },
    groom: { total: 65, attending: 35 },
    both: { total: 15, attending: 5 },
  },
  dietaryRestrictions: ["vegetarian", "vegetarian", "gluten-free", "vegan"],
  daysUntilWedding: 120,
  daysUntilDeadline: 30,
};

describe("buildUserPrompt", () => {
  it("includes total guest counts", () => {
    const prompt = buildUserPrompt(baseStats);
    expect(prompt).toContain("Total guests: 150");
    expect(prompt).toContain("Attending: 80");
    expect(prompt).toContain("Declined: 10");
    expect(prompt).toContain("Pending: 60");
  });

  it("includes invitation counts", () => {
    const prompt = buildUserPrompt(baseStats);
    expect(prompt).toContain("Invited (email sent): 120");
    expect(prompt).toContain("Not yet invited: 30");
  });

  it("includes days until wedding and deadline", () => {
    const prompt = buildUserPrompt(baseStats);
    expect(prompt).toContain("Days until wedding: 120");
    expect(prompt).toContain("Days until RSVP deadline: 30");
  });

  it("omits deadline when null", () => {
    const stats = { ...baseStats, daysUntilDeadline: null };
    const prompt = buildUserPrompt(stats);
    expect(prompt).not.toContain("RSVP deadline");
  });

  it("includes by-list breakdown", () => {
    const prompt = buildUserPrompt(baseStats);
    expect(prompt).toContain("A-list: 80 total, 50 attending, 20 pending");
    expect(prompt).toContain("B-list: 50 total, 25 attending, 20 pending");
    expect(prompt).toContain("C-list: 20 total, 5 attending, 15 pending");
  });

  it("includes by-side breakdown", () => {
    const prompt = buildUserPrompt(baseStats);
    expect(prompt).toContain("bride: 70 total, 40 attending");
    expect(prompt).toContain("groom: 65 total, 35 attending");
  });

  it("includes dietary restrictions with counts", () => {
    const prompt = buildUserPrompt(baseStats);
    expect(prompt).toContain("vegetarian: 2");
    expect(prompt).toContain("gluten-free: 1");
    expect(prompt).toContain("vegan: 1");
  });

  it("omits dietary section when empty", () => {
    const stats = { ...baseStats, dietaryRestrictions: [] };
    const prompt = buildUserPrompt(stats);
    expect(prompt).not.toContain("Dietary restrictions");
  });
});
