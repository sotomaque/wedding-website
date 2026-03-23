import { describe, expect, it } from "bun:test";

/**
 * Multi-tenancy data isolation test.
 *
 * Verifies the isolation principle: queries with weddingId filters
 * return only data belonging to the specified wedding.
 *
 * These tests use plain arrays to simulate the DB — they don't import
 * production modules (which would conflict with other test file mocks).
 * The goal is to document and verify the isolation CONTRACT.
 */

const WEDDING_A = "wedding-aaa-aaa";
const WEDDING_B = "wedding-bbb-bbb";

const allGuests = [
  {
    id: "g1",
    firstName: "Guest1",
    weddingId: WEDDING_A,
    inviteCode: "AAAA-1111",
    rsvpStatus: "yes",
  },
  {
    id: "g2",
    firstName: "Guest2",
    weddingId: WEDDING_A,
    inviteCode: "AAAA-2222",
    rsvpStatus: "pending",
  },
  {
    id: "g3",
    firstName: "Guest3",
    weddingId: WEDDING_B,
    inviteCode: "BBBB-1111",
    rsvpStatus: "yes",
  },
  {
    id: "g4",
    firstName: "Guest4",
    weddingId: WEDDING_B,
    inviteCode: "BBBB-2222",
    rsvpStatus: "no",
  },
];

const allEvents = [
  { id: "e1", name: "Ceremony A", weddingId: WEDDING_A },
  { id: "e2", name: "Reception A", weddingId: WEDDING_A },
  { id: "e3", name: "Ceremony B", weddingId: WEDDING_B },
];

const allPhotos = [
  { id: "p1", url: "/a.jpg", weddingId: WEDDING_A },
  { id: "p2", url: "/b.jpg", weddingId: WEDDING_B },
  { id: "p3", url: "/a2.jpg", weddingId: WEDDING_A },
];

/** Simulates Prisma's findMany({ where: { weddingId } }) */
function findMany<T extends { weddingId: string }>(
  dataset: T[],
  where: Partial<T>,
): T[] {
  return dataset.filter((item) =>
    Object.entries(where).every(
      ([key, value]) => item[key as keyof T] === value,
    ),
  );
}

describe("Multi-Tenancy Data Isolation", () => {
  describe("Guest isolation", () => {
    it("wedding A sees only its guests", () => {
      const guests = findMany(allGuests, { weddingId: WEDDING_A });
      expect(guests).toHaveLength(2);
      expect(guests.every((g) => g.weddingId === WEDDING_A)).toBe(true);
    });

    it("wedding B sees only its guests", () => {
      const guests = findMany(allGuests, { weddingId: WEDDING_B });
      expect(guests).toHaveLength(2);
      expect(guests.every((g) => g.weddingId === WEDDING_B)).toBe(true);
    });

    it("no cross-tenant data leaks without weddingId filter", () => {
      // Without filter — gets ALL data (this is the bug we prevent)
      const unfiltered = allGuests;
      expect(unfiltered).toHaveLength(4);

      // With filter — properly isolated
      const filtered = findMany(allGuests, { weddingId: WEDDING_A });
      expect(filtered).toHaveLength(2);
    });
  });

  describe("Event isolation", () => {
    it("wedding A has 2 events, wedding B has 1", () => {
      expect(findMany(allEvents, { weddingId: WEDDING_A })).toHaveLength(2);
      expect(findMany(allEvents, { weddingId: WEDDING_B })).toHaveLength(1);
    });
  });

  describe("Photo isolation", () => {
    it("wedding A has 2 photos, wedding B has 1", () => {
      expect(findMany(allPhotos, { weddingId: WEDDING_A })).toHaveLength(2);
      expect(findMany(allPhotos, { weddingId: WEDDING_B })).toHaveLength(1);
    });
  });

  describe("Invite code cross-tenant safety", () => {
    it("invite code from wedding A does not match in wedding B", () => {
      const matchInA = findMany(allGuests, {
        weddingId: WEDDING_A,
        inviteCode: "AAAA-1111",
      });
      expect(matchInA).toHaveLength(1);

      const matchInB = findMany(allGuests, {
        weddingId: WEDDING_B,
        inviteCode: "AAAA-1111",
      });
      expect(matchInB).toHaveLength(0);
    });

    it("same invite code could exist in two weddings without conflict", () => {
      // Simulate same code in both weddings
      const sharedCodeGuests = [
        ...allGuests,
        {
          id: "g5",
          firstName: "Guest5",
          weddingId: WEDDING_B,
          inviteCode: "AAAA-1111",
          rsvpStatus: "pending",
        },
      ];

      const fromA = findMany(sharedCodeGuests, {
        weddingId: WEDDING_A,
        inviteCode: "AAAA-1111",
      });
      const fromB = findMany(sharedCodeGuests, {
        weddingId: WEDDING_B,
        inviteCode: "AAAA-1111",
      });

      expect(fromA).toHaveLength(1);
      expect(fromA[0].id).toBe("g1");
      expect(fromB).toHaveLength(1);
      expect(fromB[0].id).toBe("g5");
    });
  });
});
