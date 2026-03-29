import { describe, expect, it } from "bun:test";
import {
  buildUserPrompt,
  formatGuestForSeating,
  systemPrompt,
} from "@/lib/ai/prompts/seating";
import type { WeddingContext } from "@/lib/db/wedding-context";
import type { GuestForSeating } from "@/lib/types/seating";

const mockWeddingCtx: WeddingContext = {
  weddingId: "wedding-123",
  slug: "test-wedding",
  coupleName: "Alice & Bob",
  weddingDate: new Date("2026-06-15"),
  rsvpDeadline: "2026-05-01",
  timezone: "America/New_York",
  status: "active",
};

describe("formatGuestForSeating", () => {
  it("should format a basic guest correctly", () => {
    const dbGuest = {
      id: "guest-uuid-123",
      firstName: "John",
      lastName: "Doe",
      side: "bride" as const,
      family: true,
      bridalPartyRole: null,
      notes: null,
      isPlusOne: false,
      primaryGuestId: null,
      inviteCode: "ABCD-1234",
      partyId: "party-uuid-1",
    };

    const result = formatGuestForSeating(dbGuest);

    expect(result).toEqual({
      id: "guest-uuid-123",
      name: "John Doe",
      side: "bride",
      family: true,
      bridalPartyRole: null,
      notes: null,
      isPlusOne: false,
      primaryGuestId: null,
      inviteCode: "ABCD-1234",
      partyId: "party-uuid-1",
    });
  });

  it("should handle guest without last name", () => {
    const dbGuest = {
      id: "guest-uuid-123",
      firstName: "Madonna",
      lastName: null,
      side: "groom" as const,
      family: false,
      bridalPartyRole: "groomsmen",
      notes: "VIP",
      isPlusOne: false,
      primaryGuestId: null,
      inviteCode: "EFGH-5678",
      partyId: null,
    };

    const result = formatGuestForSeating(dbGuest);

    expect(result.name).toBe("Madonna");
    expect(result.bridalPartyRole).toBe("groomsmen");
    expect(result.notes).toBe("VIP");
  });

  it("should handle plus one correctly", () => {
    const dbGuest = {
      id: "plus-one-uuid",
      firstName: "Jane",
      lastName: "Smith",
      side: "bride" as const,
      family: false,
      bridalPartyRole: null,
      notes: null,
      isPlusOne: true,
      primaryGuestId: "primary-uuid",
      inviteCode: "ABCD-1234",
      partyId: "party-uuid-1",
    };

    const result = formatGuestForSeating(dbGuest);

    expect(result.isPlusOne).toBe(true);
    expect(result.primaryGuestId).toBe("primary-uuid");
  });

  it("should handle guest with both side", () => {
    const dbGuest = {
      id: "both-sides-uuid",
      firstName: "Mutual",
      lastName: "Friend",
      side: "both" as const,
      family: false,
      bridalPartyRole: null,
      notes: null,
      isPlusOne: false,
      primaryGuestId: null,
      inviteCode: "BOTH-1234",
      partyId: null,
    };

    const result = formatGuestForSeating(dbGuest);

    expect(result.side).toBe("both");
  });
});

describe("systemPrompt", () => {
  it("should include wedding context", () => {
    const prompt = systemPrompt(mockWeddingCtx);

    expect(prompt).toContain("Alice & Bob");
    expect(prompt).toContain("America/New_York");
  });

  it("should include seating rules", () => {
    const prompt = systemPrompt(mockWeddingCtx);

    expect(prompt).toContain("PARTIES MUST SIT TOGETHER");
    expect(prompt).toContain("SEPARATE POTENTIAL CONFLICTS");
    expect(prompt).toContain("GROUP BY FAMILY");
    expect(prompt).toContain("GROUP BY SIDE");
    expect(prompt).toContain("BRIDAL PARTY PLACEMENT");
    expect(prompt).toContain("BALANCE TABLES");
  });

  it("should include critical instructions about UUIDs", () => {
    const prompt = systemPrompt(mockWeddingCtx);

    expect(prompt).toContain("EXACT guest ID UUIDs");
    expect(prompt).toContain("DO NOT use party IDs or invite codes");
  });

  it("should include JSON output format instructions", () => {
    const prompt = systemPrompt(mockWeddingCtx);

    expect(prompt).toContain("assignments");
    expect(prompt).toContain("tableNumber");
    expect(prompt).toContain("guestIds");
    expect(prompt).toContain("summary");
  });
});

describe("buildUserPrompt", () => {
  const mockGuests: GuestForSeating[] = [
    {
      id: "uuid-1",
      name: "John Doe",
      side: "bride",
      family: true,
      bridalPartyRole: null,
      notes: null,
      isPlusOne: false,
      primaryGuestId: null,
      inviteCode: "ABCD-1234",
      partyId: "party-1",
    },
    {
      id: "uuid-2",
      name: "Jane Doe",
      side: "bride",
      family: true,
      bridalPartyRole: null,
      notes: null,
      isPlusOne: true,
      primaryGuestId: "uuid-1",
      inviteCode: "ABCD-1234",
      partyId: "party-1",
    },
    {
      id: "uuid-3",
      name: "Best Man",
      side: "groom",
      family: false,
      bridalPartyRole: "best_man",
      notes: null,
      isPlusOne: false,
      primaryGuestId: null,
      inviteCode: "EFGH-5678",
      partyId: "party-2",
    },
  ];

  it("should include guest count in prompt", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    expect(prompt).toContain("3 guests");
  });

  it("should include table count in prompt", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    expect(prompt).toContain("5 tables");
    expect(prompt).toContain("8 seats each");
    expect(prompt).toContain("40 total seats");
  });

  it("should include guest IDs in prompt", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    expect(prompt).toContain("uuid-1");
    expect(prompt).toContain("uuid-2");
    expect(prompt).toContain("uuid-3");
  });

  it("should include guest names in prompt", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    expect(prompt).toContain("John Doe");
    expect(prompt).toContain("Jane Doe");
    expect(prompt).toContain("Best Man");
  });

  it("should include party identifiers for grouping", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    // When partyId is available, it uses party IDs for grouping
    expect(prompt).toContain("party-1");
    expect(prompt).toContain("party-2");
  });

  it("should include party size for couples", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    // John and Jane share party_id, should show party size 2
    expect(prompt).toContain("Party Size: 2");
    // Best Man is solo, should show party size 1
    expect(prompt).toContain("Party Size: 1");
  });

  it("should include side information", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    expect(prompt).toContain("Side: bride");
    expect(prompt).toContain("Side: groom");
  });

  it("should include family designation", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    expect(prompt).toContain("Family: yes");
    expect(prompt).toContain("Family: no");
  });

  it("should include bridal party role when present", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    expect(prompt).toContain("Bridal Party: best_man");
    expect(prompt).toContain("Bridal Party: none");
  });

  it("should include notes when present", () => {
    const guestsWithNotes: GuestForSeating[] = [
      {
        id: "uuid-notes",
        name: "Guest With Notes",
        side: "bride",
        family: false,
        bridalPartyRole: null,
        notes: "Allergic to peanuts",
        isPlusOne: false,
        primaryGuestId: null,
        inviteCode: "NOTE-1234",
        partyId: null,
      },
    ];

    const prompt = buildUserPrompt({
      guests: guestsWithNotes,
      tables: { count: 1, seatsPerTable: 8 },
    });

    expect(prompt).toContain("Notes: Allergic to peanuts");
  });

  it("should enforce seats per table limit", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 10 },
    });

    expect(prompt).toContain("Do not exceed 10 guests per table");
  });

  it("should append custom prompt when provided", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
      customPrompt: "Keep the Doe family near the head table",
    });

    expect(prompt).toContain(
      "Additional constraints from the couple: Keep the Doe family near the head table",
    );
  });

  it("should not append custom prompt section when not provided", () => {
    const prompt = buildUserPrompt({
      guests: mockGuests,
      tables: { count: 5, seatsPerTable: 8 },
    });

    expect(prompt).not.toContain("Additional constraints from the couple");
  });
});
