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
const mockCreate = mock(() => Promise.resolve({ id: "new-id" }));
const mockDelete = mock(() => Promise.resolve({}));
const mockGuestCreate = mock(() =>
  Promise.resolve({
    id: "new-guest-id",
    firstName: "Test",
    lastName: "Guest",
    email: "test@example.com",
    inviteCode: "ABCD-1234",
    side: "groom",
    list: "a",
  }),
);

mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      count: mockCount,
      groupBy: mockGroupBy,
      update: mockUpdate,
      create: mockGuestCreate,
      delete: mockDelete,
    },
    event: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      aggregate: mockAggregate,
      create: mock(() =>
        Promise.resolve({
          id: "new-event-id",
          name: "Test Event",
          description: null,
          eventDate: null,
          startTime: null,
          endTime: null,
          locationName: null,
          locationAddress: null,
          isDefault: false,
          displayOrder: 1,
          weddingId: "test-wedding-id",
        }),
      ),
    },
    guestEventInvite: {
      createMany: mock(() => Promise.resolve({ count: 0 })),
    },
    gift: {
      aggregate: mockAggregate,
      findMany: mockFindMany,
    },
    wedding: {
      findUniqueOrThrow: mockFindUniqueOrThrow,
    },
    party: {
      create: mockCreate,
    },
    weddingTodo: {
      aggregate: mock(() => Promise.resolve({ _max: { displayOrder: 3 } })),
      create: mock(() => Promise.resolve({ id: "todo-1", title: "Test todo" })),
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
    mockFindFirst.mockReset();
    mockCount.mockReset();
    mockAggregate.mockReset();
    mockUpdate.mockReset();
    mockCreate.mockReset().mockResolvedValue({ id: "new-party-id" });
    mockDelete.mockReset();
    mockGuestCreate.mockReset().mockResolvedValue({
      id: "new-guest-id",
      firstName: "Test",
      lastName: "Guest",
      email: "test@example.com",
      inviteCode: "ABCD-1234",
      side: "groom",
      list: "a",
    });
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

  describe("createGuest", () => {
    const toolCtx = {
      toolCallId: "test",
      messages: [],
      abortSignal: new AbortController().signal,
    };

    it("creates a party and guest with invite code", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      const result = await tools.createGuest.execute(
        {
          firstName: "Cody",
          lastName: "Johnson",
          email: "cody@example.com",
          side: "groom",
          list: "a",
        },
        toolCtx,
      );

      expect(result.success).toBe(true);
      // Party should be created first
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate.mock.calls[0][0].data.weddingId).toBe(WEDDING_ID);
      // Guest should be created with party ID
      expect(mockGuestCreate).toHaveBeenCalledTimes(1);
      const guestData = mockGuestCreate.mock.calls[0][0].data;
      expect(guestData.weddingId).toBe(WEDDING_ID);
      expect(guestData.firstName).toBe("Cody");
      expect(guestData.lastName).toBe("Johnson");
      expect(guestData.email).toBe("cody@example.com");
      expect(guestData.side).toBe("groom");
      expect(guestData.partyId).toBe("new-party-id");
      expect(guestData.inviteCode).toBeTruthy();
    });

    it("defaults optional fields correctly", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      await tools.createGuest.execute({ firstName: "Solo" }, toolCtx);

      const guestData = mockGuestCreate.mock.calls[0][0].data;
      expect(guestData.list).toBe("a");
      expect(guestData.family).toBe(false);
      expect(guestData.plusOneAllowed).toBe(false);
      expect(guestData.lastName).toBeNull();
      expect(guestData.email).toBeNull();
      expect(guestData.side).toBeNull();
      expect(guestData.gender).toBeNull();
    });

    it("returns guest info with invite code on success", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      const result = await tools.createGuest.execute(
        { firstName: "Test" },
        toolCtx,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.guest.id).toBe("new-guest-id");
        expect(result.guest.inviteCode).toBe("ABCD-1234");
      }
    });
  });

  describe("deleteGuest", () => {
    const toolCtx = {
      toolCallId: "test",
      messages: [],
      abortSignal: new AbortController().signal,
    };

    it("deletes a guest that belongs to the wedding", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockFindFirst.mockResolvedValueOnce({
        id: "g-1",
        firstName: "Jane",
        lastName: "Doe",
        weddingId: WEDDING_ID,
      });

      const result = await tools.deleteGuest.execute(
        { guestId: "g-1" },
        toolCtx,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.deleted).toBe("Jane Doe");
      }
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "g-1" } });
    });

    it("rejects deletion of non-existent guest", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockFindFirst.mockResolvedValueOnce(null);

      const result = await tools.deleteGuest.execute(
        { guestId: "nonexistent" },
        toolCtx,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Guest not found");
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("scopes findFirst by weddingId", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockFindFirst.mockResolvedValueOnce(null);

      await tools.deleteGuest.execute({ guestId: "g-1" }, toolCtx);

      expect(mockFindFirst.mock.calls[0][0]).toEqual({
        where: { id: "g-1", weddingId: WEDDING_ID },
      });
    });
  });

  describe("bulkInvite", () => {
    const toolCtx = {
      toolCallId: "test",
      messages: [],
      abortSignal: new AbortController().signal,
    };

    it("returns zero sent when no guests match", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockFindMany.mockResolvedValueOnce([]);

      const result = await tools.bulkInvite.execute(
        { list: "a", uninvitedOnly: true },
        toolCtx,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.sent).toBe(0);
      }
    });

    it("builds correct where clause with all filters", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockFindMany.mockResolvedValueOnce([]);

      await tools.bulkInvite.execute(
        { list: "b", status: "pending", uninvitedOnly: true },
        toolCtx,
      );

      const whereArg = mockFindMany.mock.calls[0][0].where;
      expect(whereArg.weddingId).toBe(WEDDING_ID);
      expect(whereArg.list).toBe("b");
      expect(whereArg.rsvpStatus).toBe("pending");
      expect(whereArg.numberOfResends).toBe(0);
      expect(whereArg.isPlusOne).toBe(false);
    });

    it("omits optional filters when not provided", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockFindMany.mockResolvedValueOnce([]);

      await tools.bulkInvite.execute({}, toolCtx);

      const whereArg = mockFindMany.mock.calls[0][0].where;
      expect(whereArg.weddingId).toBe(WEDDING_ID);
      expect(whereArg.list).toBeUndefined();
      expect(whereArg.rsvpStatus).toBeUndefined();
      expect(whereArg.numberOfResends).toBeUndefined();
    });
  });

  describe("createEvent", () => {
    const toolCtx = {
      toolCallId: "test",
      messages: [],
      abortSignal: new AbortController().signal,
    };

    it("creates an event with auto-incremented displayOrder", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockAggregate.mockResolvedValueOnce({
        _max: { displayOrder: 5 },
      });

      const result = await tools.createEvent.execute(
        { name: "Rehearsal Dinner" },
        toolCtx,
      );

      expect(result.success).toBe(true);
      // Verify aggregate was called to get max displayOrder
      expect(mockAggregate).toHaveBeenCalledWith({
        where: { weddingId: WEDDING_ID },
        _max: { displayOrder: true },
      });
    });

    it("parses date and time strings correctly", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockAggregate.mockResolvedValueOnce({
        _max: { displayOrder: 0 },
      });

      // Access the db mock's event.create to check args
      const { db: mockDb } = await import("@/lib/db");
      const eventCreate = mockDb.event.create as ReturnType<typeof mock>;
      eventCreate.mockClear();

      await tools.createEvent.execute(
        {
          name: "Rehearsal",
          eventDate: "2026-07-29",
          startTime: "18:00",
          endTime: "21:00",
        },
        toolCtx,
      );

      const createData = eventCreate.mock.calls[0]?.[0]?.data;
      expect(createData.eventDate).toEqual(new Date("2026-07-29T00:00:00Z"));
      expect(createData.startTime).toEqual(new Date("1970-01-01T18:00:00Z"));
      expect(createData.endTime).toEqual(new Date("1970-01-01T21:00:00Z"));
    });

    it("auto-invites all guests when isDefault is true", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockAggregate.mockResolvedValueOnce({
        _max: { displayOrder: 0 },
      });

      mockFindMany.mockResolvedValueOnce([
        { id: "g-1" },
        { id: "g-2" },
        { id: "g-3" },
      ]);

      const { db: mockDb } = await import("@/lib/db");
      const inviteCreateMany = mockDb.guestEventInvite.createMany as ReturnType<
        typeof mock
      >;
      inviteCreateMany.mockClear();

      await tools.createEvent.execute(
        { name: "Ceremony", isDefault: true },
        toolCtx,
      );

      expect(inviteCreateMany).toHaveBeenCalledTimes(1);
      const inviteData = inviteCreateMany.mock.calls[0][0].data;
      expect(inviteData).toHaveLength(3);
    });

    it("does not auto-invite when isDefault is false", async () => {
      const tools = createWeddingTools(WEDDING_ID);

      mockAggregate.mockResolvedValueOnce({
        _max: { displayOrder: 0 },
      });

      const { db: mockDb } = await import("@/lib/db");
      const inviteCreateMany = mockDb.guestEventInvite.createMany as ReturnType<
        typeof mock
      >;
      inviteCreateMany.mockClear();

      await tools.createEvent.execute(
        { name: "After Party", isDefault: false },
        toolCtx,
      );

      expect(inviteCreateMany).not.toHaveBeenCalled();
    });
  });
});
