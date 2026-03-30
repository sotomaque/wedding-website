import { beforeEach, describe, expect, it, mock } from "bun:test";

// Re-export real `tool` and `z` from "ai" — only mock what's needed
const realAi = await import("ai");
mock.module("ai", () => realAi);

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
    Promise.resolve({
      weddingId: "test-wedding-id",
      slug: "test-wedding",
      coupleName: "Test Couple",
      weddingDate: new Date("2026-07-30"),
    }),
  ),
}));

// Create Prisma-style db mocks
const mockGroupBy = mock(() => Promise.resolve([]));
const mockFindMany = mock(() => Promise.resolve([]));
const mockFindFirst = mock(() => Promise.resolve(null));
const mockFindUniqueOrThrow = mock(() => Promise.resolve({}));
const mockCount = mock(() => Promise.resolve(0));
const mockAggregate = mock(() =>
  Promise.resolve({ _sum: { amountCents: 0 }, _count: 0 }),
);
const mockUpdate = mock(() => Promise.resolve({}));

mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      count: mockCount,
      groupBy: mockGroupBy,
      update: mockUpdate,
    },
    event: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
    },
    gift: {
      aggregate: mockAggregate,
      findMany: mockFindMany,
    },
    wedding: {
      findUniqueOrThrow: mockFindUniqueOrThrow,
    },
  },
}));

// For modules used only by tools we don't test (resendInvite, etc.),
// re-export real implementations to avoid polluting other tests' mocks.
const realWeddingContentData = await import("@/lib/db/wedding-content-data");
mock.module("@/lib/db/wedding-content-data", () => realWeddingContentData);

const realEmailHelpers = await import("@/lib/email/helpers");
mock.module("@/lib/email/helpers", () => realEmailHelpers);

const realRenderTemplate = await import("@/lib/email/render-template");
mock.module("@/lib/email/render-template", () => realRenderTemplate);

const realResendClient = await import("@/lib/email/resend-client");
mock.module("@/lib/email/resend-client", () => realResendClient);

const realUrl = await import("@/lib/url");
mock.module("@/lib/url", () => realUrl);

// Import after mocks
const { createWeddingTools } = await import("@/lib/ai/tools/wedding-tools");

describe("Wedding Tools", () => {
  const WEDDING_ID = "test-wedding-id";

  beforeEach(() => {
    mockGroupBy.mockReset();
    mockFindMany.mockReset();
    mockCount.mockReset();
    mockAggregate.mockReset();
  });

  describe("getRsvpStats", () => {
    it("correctly transforms groupBy results into stats", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      // Mock the two groupBy calls
      mockGroupBy
        .mockResolvedValueOnce([
          // totals by rsvpStatus
          { rsvpStatus: "yes", _count: 25 },
          { rsvpStatus: "no", _count: 5 },
          { rsvpStatus: "pending", _count: 10 },
        ])
        .mockResolvedValueOnce([
          // by list + rsvpStatus
          { list: "a", rsvpStatus: "yes", _count: 15 },
          { list: "a", rsvpStatus: "no", _count: 3 },
          { list: "a", rsvpStatus: "pending", _count: 2 },
          { list: "b", rsvpStatus: "yes", _count: 8 },
          { list: "b", rsvpStatus: "pending", _count: 5 },
          { list: "c", rsvpStatus: "yes", _count: 2 },
          { list: "c", rsvpStatus: "no", _count: 2 },
          { list: "c", rsvpStatus: "pending", _count: 3 },
        ]);

      const result = await tools.getRsvpStats.execute(
        {},
        {
          toolCallId: "test",
          messages: [],
          abortSignal: new AbortController().signal,
        },
      );

      expect(result).toEqual({
        total: 40,
        attending: 25,
        declined: 5,
        pending: 10,
        byList: {
          a: { total: 20, attending: 15 },
          b: { total: 13, attending: 8 },
          c: { total: 7, attending: 2 },
        },
      });
    });

    it("handles empty database (no guests)", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockGroupBy
        .mockResolvedValueOnce([]) // no totals
        .mockResolvedValueOnce([]); // no list groups

      const result = await tools.getRsvpStats.execute(
        {},
        {
          toolCallId: "test",
          messages: [],
          abortSignal: new AbortController().signal,
        },
      );

      expect(result).toEqual({
        total: 0,
        attending: 0,
        declined: 0,
        pending: 0,
        byList: {
          a: { total: 0, attending: 0 },
          b: { total: 0, attending: 0 },
          c: { total: 0, attending: 0 },
        },
      });
    });

    it("handles lists with only one status", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockGroupBy
        .mockResolvedValueOnce([{ rsvpStatus: "pending", _count: 50 }])
        .mockResolvedValueOnce([
          { list: "a", rsvpStatus: "pending", _count: 50 },
        ]);

      const result = await tools.getRsvpStats.execute(
        {},
        {
          toolCallId: "test",
          messages: [],
          abortSignal: new AbortController().signal,
        },
      );

      expect(result.total).toBe(50);
      expect(result.attending).toBe(0);
      expect(result.declined).toBe(0);
      expect(result.pending).toBe(50);
      expect(result.byList.a).toEqual({ total: 50, attending: 0 });
      expect(result.byList.b).toEqual({ total: 0, attending: 0 });
      expect(result.byList.c).toEqual({ total: 0, attending: 0 });
    });

    it("uses only 2 DB queries (groupBy calls)", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockGroupBy.mockResolvedValue([]);

      await tools.getRsvpStats.execute(
        {},
        {
          toolCallId: "test",
          messages: [],
          abortSignal: new AbortController().signal,
        },
      );

      expect(mockGroupBy).toHaveBeenCalledTimes(2);
      // Verify first call groups by rsvpStatus
      expect(mockGroupBy.mock.calls[0][0]).toEqual({
        by: ["rsvpStatus"],
        where: { weddingId: WEDDING_ID },
        _count: true,
      });
      // Verify second call groups by list + rsvpStatus
      expect(mockGroupBy.mock.calls[1][0]).toEqual({
        by: ["list", "rsvpStatus"],
        where: { weddingId: WEDDING_ID },
        _count: true,
      });
    });
  });

  describe("lookupGuest", () => {
    it("searches by name, email, and invite code", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockFindMany.mockResolvedValueOnce([
        {
          id: "g-1",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          rsvpStatus: "yes",
          inviteCode: "ABC123",
          side: "bride",
          list: "a",
          dietaryRestrictions: "vegetarian",
          isPlusOne: false,
        },
      ]);

      const result = await tools.lookupGuest.execute(
        { query: "Jane" },
        {
          toolCallId: "test",
          messages: [],
          abortSignal: new AbortController().signal,
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Jane");
      expect(result[0].rsvpStatus).toBe("yes");
    });
  });

  describe("getGuestsByStatus", () => {
    it("returns guests filtered by status", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockFindMany.mockResolvedValueOnce([
        {
          id: "g-1",
          firstName: "Bob",
          lastName: "Smith",
          email: "bob@test.com",
        },
        {
          id: "g-2",
          firstName: "Alice",
          lastName: "",
          email: "alice@test.com",
        },
      ]);

      const result = await tools.getGuestsByStatus.execute(
        { status: "pending" },
        {
          toolCallId: "test",
          messages: [],
          abortSignal: new AbortController().signal,
        },
      );

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Bob Smith");
      expect(result[1].name).toBe("Alice");
    });
  });
});
