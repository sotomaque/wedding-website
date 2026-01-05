import { describe, expect, it } from "bun:test";
import {
  buildSeatingPrompt,
  formatGuestForSeating,
} from "@/lib/ai/seating-prompt";
import type { GuestForSeating } from "@/lib/types/seating";

describe("formatGuestForSeating", () => {
  it("should format a basic guest correctly", () => {
    const dbGuest = {
      id: "guest-uuid-123",
      first_name: "John",
      last_name: "Doe",
      side: "bride" as const,
      family: true,
      bridal_party_role: null,
      notes: null,
      is_plus_one: false,
      primary_guest_id: null,
      invite_code: "ABCD-1234",
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
    });
  });

  it("should handle guest without last name", () => {
    const dbGuest = {
      id: "guest-uuid-123",
      first_name: "Madonna",
      last_name: null,
      side: "groom" as const,
      family: false,
      bridal_party_role: "groomsmen",
      notes: "VIP",
      is_plus_one: false,
      primary_guest_id: null,
      invite_code: "EFGH-5678",
    };

    const result = formatGuestForSeating(dbGuest);

    expect(result.name).toBe("Madonna");
    expect(result.bridalPartyRole).toBe("groomsmen");
    expect(result.notes).toBe("VIP");
  });

  it("should handle plus one correctly", () => {
    const dbGuest = {
      id: "plus-one-uuid",
      first_name: "Jane",
      last_name: "Smith",
      side: "bride" as const,
      family: false,
      bridal_party_role: null,
      notes: null,
      is_plus_one: true,
      primary_guest_id: "primary-uuid",
      invite_code: "ABCD-1234",
    };

    const result = formatGuestForSeating(dbGuest);

    expect(result.isPlusOne).toBe(true);
    expect(result.primaryGuestId).toBe("primary-uuid");
  });

  it("should handle guest with both side", () => {
    const dbGuest = {
      id: "both-sides-uuid",
      first_name: "Mutual",
      last_name: "Friend",
      side: "both" as const,
      family: false,
      bridal_party_role: null,
      notes: null,
      is_plus_one: false,
      primary_guest_id: null,
      invite_code: "BOTH-1234",
    };

    const result = formatGuestForSeating(dbGuest);

    expect(result.side).toBe("both");
  });
});

describe("buildSeatingPrompt", () => {
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
    },
  ];

  it("should include guest count in prompt", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("3 guests");
  });

  it("should include table count in prompt", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("5 tables");
    expect(prompt).toContain("8 seats each");
    expect(prompt).toContain("40 total seats");
  });

  it("should include guest IDs in prompt", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("uuid-1");
    expect(prompt).toContain("uuid-2");
    expect(prompt).toContain("uuid-3");
  });

  it("should include guest names in prompt", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("John Doe");
    expect(prompt).toContain("Jane Doe");
    expect(prompt).toContain("Best Man");
  });

  it("should include invite codes for grouping", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("ABCD-1234");
    expect(prompt).toContain("EFGH-5678");
  });

  it("should include group size for couples", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    // John and Jane share invite code, should show group size 2
    expect(prompt).toContain("Group Size: 2");
    // Best Man is solo, should show group size 1
    expect(prompt).toContain("Group Size: 1");
  });

  it("should include side information", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("Side: bride");
    expect(prompt).toContain("Side: groom");
  });

  it("should include family designation", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("Family: yes");
    expect(prompt).toContain("Family: no");
  });

  it("should include bridal party role when present", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

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
      },
    ];

    const prompt = buildSeatingPrompt(guestsWithNotes, 1, 8);

    expect(prompt).toContain("Notes: Allergic to peanuts");
  });

  it("should include critical instructions about UUIDs", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("EXACT guest ID UUIDs");
    expect(prompt).toContain("DO NOT use invite codes");
  });

  it("should include JSON output format instructions", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("assignments");
    expect(prompt).toContain("tableNumber");
    expect(prompt).toContain("guestIds");
    expect(prompt).toContain("summary");
  });

  it("should include seating rules", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 8);

    expect(prompt).toContain("COUPLES MUST SIT TOGETHER");
    expect(prompt).toContain("SEPARATE POTENTIAL CONFLICTS");
    expect(prompt).toContain("GROUP BY FAMILY");
    expect(prompt).toContain("GROUP BY SIDE");
    expect(prompt).toContain("BRIDAL PARTY PLACEMENT");
    expect(prompt).toContain("BALANCE TABLES");
  });

  it("should enforce seats per table limit", () => {
    const prompt = buildSeatingPrompt(mockGuests, 5, 10);

    expect(prompt).toContain("Do not exceed 10 guests per table");
  });
});
