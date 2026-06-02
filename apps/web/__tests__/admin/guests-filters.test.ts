import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock next/headers
mock.module("next/headers", () => ({
  headers: mock(() =>
    Promise.resolve({
      get: (key: string) => {
        if (key === "x-wedding-id") return "test-wedding-id";
        return null;
      },
    }),
  ),
}));

// Mock env
mock.module("@/env", () => ({
  env: {
    POSTGRES_URL: undefined,
    DATABASE_URL: "postgresql://test",
    ADMIN_EMAILS: "admin@example.com",
  },
}));

// Mock wedding context
mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
  getWeddingContext: mock(() =>
    Promise.resolve({ weddingId: "test-wedding-id", slug: "test-wedding" }),
  ),
}));

// Track findMany calls
const mockFindMany = mock(() => Promise.resolve([]));

mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mockFindMany,
    },
  },
}));

const { getGuests } = await import("@/app/[slug]/admin/guests/actions");

describe("getGuests", () => {
  beforeEach(() => {
    mockFindMany.mockReset().mockResolvedValue([]);
  });

  describe("event filter", () => {
    it("applies single event filter with some", async () => {
      await getGuests({ events: "event-1" });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.guestEventInvites).toEqual({
        some: { eventId: "event-1" },
      });
    });

    it("applies multiple events as AND (must be invited to all)", async () => {
      await getGuests({ events: "event-1,event-2" });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.AND).toEqual([
        { guestEventInvites: { some: { eventId: "event-1" } } },
        { guestEventInvites: { some: { eventId: "event-2" } } },
      ]);
    });

    it("does not apply event filter when empty", async () => {
      await getGuests({});

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.guestEventInvites).toBeUndefined();
      expect(where.AND).toBeUndefined();
    });

    it("ignores empty string in events param", async () => {
      await getGuests({ events: "" });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.guestEventInvites).toBeUndefined();
      expect(where.AND).toBeUndefined();
    });
  });

  describe("multi-value rsvpStatus", () => {
    it("applies single status as direct value", async () => {
      await getGuests({ rsvpStatus: "yes" });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.rsvpStatus).toBe("yes");
    });

    it("applies multiple statuses with in operator", async () => {
      await getGuests({ rsvpStatus: "yes,pending" });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.rsvpStatus).toEqual({ in: ["yes", "pending"] });
    });

    it("handles all three statuses", async () => {
      await getGuests({ rsvpStatus: "yes,no,pending" });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.rsvpStatus).toEqual({ in: ["yes", "no", "pending"] });
    });

    it("does not apply rsvpStatus when not provided", async () => {
      await getGuests({});

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.rsvpStatus).toBeUndefined();
    });
  });

  describe("combined filters", () => {
    it("combines event filter with other filters", async () => {
      await getGuests({
        events: "event-1",
        rsvpStatus: "yes",
        side: "bride",
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.side).toBe("bride");
      expect(where.rsvpStatus).toBe("yes");
      expect(where.guestEventInvites).toEqual({
        some: { eventId: "event-1" },
      });
    });
  });
});
