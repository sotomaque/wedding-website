import { beforeEach, describe, expect, it, mock } from "bun:test";

// Admin auth resolves via the superadmin path (ADMIN_EMAILS) so these tests
// don't need to mock the weddingAdmin lookup for the happy path.
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
    RESEND_API_KEY: "test-key",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

const mockCurrentUser = mock(() =>
  Promise.resolve({
    id: "admin-123",
    emailAddresses: [{ emailAddress: "admin@example.com" }],
  }),
);
mock.module("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
}));

mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
  getWeddingContext: mock(() =>
    Promise.resolve({ weddingId: "test-wedding-id", slug: "test-wedding" }),
  ),
}));

// --- db mocks ---
const mockEventAggregate = mock(() =>
  Promise.resolve({ _max: { displayOrder: 2 } }),
);
const mockEventCreate = mock((args: { data: Record<string, unknown> }) =>
  Promise.resolve({ id: "event-1", ...args.data }),
);
const mockEventFindMany = mock(() => Promise.resolve([]));
const mockGuestFindMany = mock(() => Promise.resolve([]));
const mockGuestEventInviteCreateMany = mock(() =>
  Promise.resolve({ count: 0 }),
);
const mockTemplateCreate = mock((args: { data: Record<string, unknown> }) =>
  Promise.resolve({ id: "tmpl-1", ...args.data }),
);
const mockTemplateFindMany = mock(() => Promise.resolve([]));
const mockGiftFindUnique = mock(() => Promise.resolve(null as unknown));
const mockGiftUpdate = mock((args: { data: Record<string, unknown> }) =>
  Promise.resolve({ id: "gift-1", ...args.data }),
);

mock.module("@/lib/db", () => ({
  db: {
    event: {
      findMany: mockEventFindMany,
      aggregate: mockEventAggregate,
      create: mockEventCreate,
    },
    guest: { findMany: mockGuestFindMany },
    guestEventInvite: { createMany: mockGuestEventInviteCreateMany },
    emailTemplate: {
      findMany: mockTemplateFindMany,
      create: mockTemplateCreate,
    },
    gift: { findUnique: mockGiftFindUnique, update: mockGiftUpdate },
    weddingAdmin: { findFirst: mock(() => Promise.resolve(null)) },
  },
}));

function postRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function resetAuth() {
  mockCurrentUser.mockResolvedValue({
    id: "admin-123",
    emailAddresses: [{ emailAddress: "admin@example.com" }],
  });
}

describe("POST /api/admin/events", () => {
  beforeEach(() => {
    resetAuth();
    mockEventCreate.mockClear();
    mockGuestEventInviteCreateMany.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestFindMany.mockResolvedValue([]);
  });

  it("rejects an unauthenticated request with 401", async () => {
    mockCurrentUser.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/events", { name: "Brunch" }),
    );
    expect(res.status).toBe(401);
  });

  it("requires a name", async () => {
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/events", { description: "x" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Name is required");
  });

  it("creates a non-default event without auto-inviting guests", async () => {
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/events", {
        name: "Welcome Brunch",
        eventDate: "2026-07-29",
      }),
    );
    expect(res.status).toBe(201);
    expect(mockEventCreate).toHaveBeenCalledTimes(1);
    // displayOrder is max + 1
    expect(mockEventCreate.mock.calls[0][0].data.displayOrder).toBe(3);
    expect(mockGuestEventInviteCreateMany).not.toHaveBeenCalled();
  });

  it("auto-invites every guest for a default event", async () => {
    mockGuestFindMany.mockResolvedValue([{ id: "g1" }, { id: "g2" }]);
    const { POST } = await import("@/app/api/admin/events/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/events", {
        name: "Ceremony",
        isDefault: true,
      }),
    );
    expect(res.status).toBe(201);
    expect(mockGuestEventInviteCreateMany).toHaveBeenCalledTimes(1);
    const arg = mockGuestEventInviteCreateMany.mock.calls[0][0];
    expect(arg.data).toEqual([
      { guestId: "g1", eventId: "event-1", weddingId: "test-wedding-id" },
      { guestId: "g2", eventId: "event-1", weddingId: "test-wedding-id" },
    ]);
    expect(arg.skipDuplicates).toBe(true);
  });
});

describe("POST /api/admin/templates", () => {
  beforeEach(() => {
    resetAuth();
    mockTemplateCreate.mockClear();
  });

  it("requires type, name, subject, and htmlBody", async () => {
    const { POST } = await import("@/app/api/admin/templates/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/templates", {
        name: "Only name",
      }),
    );
    expect(res.status).toBe(400);
    expect(mockTemplateCreate).not.toHaveBeenCalled();
  });

  it("creates a template with the wedding scoped in", async () => {
    const { POST } = await import("@/app/api/admin/templates/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/templates", {
        type: "welcome",
        name: "Welcome",
        subject: "Hi",
        htmlBody: "<p>Hi</p>",
      }),
    );
    expect(res.status).toBe(201);
    const data = mockTemplateCreate.mock.calls[0][0].data;
    expect(data.weddingId).toBe("test-wedding-id");
    expect(data.isActive).toBe(true); // defaulted
    expect(data.variables).toEqual([]); // defaulted
  });

  it("rejects an unauthenticated request", async () => {
    mockCurrentUser.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/admin/templates/route");
    const res = await POST(
      postRequest("http://localhost/api/admin/templates", {
        type: "welcome",
        name: "W",
        subject: "S",
        htmlBody: "B",
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/admin/gifts", () => {
  beforeEach(() => {
    resetAuth();
    mockGiftUpdate.mockClear();
    mockGiftFindUnique.mockResolvedValue(null);
  });

  it("requires a gift id", async () => {
    const { PATCH } = await import("@/app/api/admin/gifts/route");
    const res = await PATCH(
      patchRequest("http://localhost/api/admin/gifts", { notes: "x" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Gift ID is required");
  });

  it("404s when the gift is missing or belongs to another wedding", async () => {
    const { PATCH } = await import("@/app/api/admin/gifts/route");

    // missing
    let res = await PATCH(
      patchRequest("http://localhost/api/admin/gifts", { id: "gift-1" }),
    );
    expect(res.status).toBe(404);

    // wrong wedding
    mockGiftFindUnique.mockResolvedValueOnce({
      id: "gift-1",
      weddingId: "another-wedding",
    } as unknown);
    res = await PATCH(
      patchRequest("http://localhost/api/admin/gifts", { id: "gift-1" }),
    );
    expect(res.status).toBe(404);
    expect(mockGiftUpdate).not.toHaveBeenCalled();
  });

  it("updates a gift and stamps thankYouEmailSentAt when marked sent", async () => {
    mockGiftFindUnique.mockResolvedValue({
      id: "gift-1",
      weddingId: "test-wedding-id",
    } as unknown);
    const { PATCH } = await import("@/app/api/admin/gifts/route");
    const res = await PATCH(
      patchRequest("http://localhost/api/admin/gifts", {
        id: "gift-1",
        thankYouEmailSent: true,
        notes: "thanked",
      }),
    );
    expect(res.status).toBe(200);
    const data = mockGiftUpdate.mock.calls[0][0].data;
    expect(data.thankYouEmailSent).toBe(true);
    expect(data.thankYouEmailSentAt).toBeDefined();
    expect(data.notes).toBe("thanked");
  });
});
