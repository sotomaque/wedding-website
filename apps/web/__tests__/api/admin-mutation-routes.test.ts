import { beforeEach, describe, expect, it, mock } from "bun:test";

// Admin auth resolves via the superadmin path (ADMIN_EMAILS) so these tests
// don't need to mock the weddingAdmin lookup for the happy path.
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
    RESEND_API_KEY: "test-key",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    E2E_TEST_MODE: undefined,
  },
}));

const mockCurrentUser = mock(() =>
  Promise.resolve({
    id: "admin-123",
    primaryEmailAddressId: "email-primary",
    emailAddresses: [
      {
        id: "email-primary",
        emailAddress: "admin@example.com",
        verification: { status: "verified" },
      },
    ],
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

// Wedding settings + Resend SDK for the gift thank-you send path.
mock.module("@/lib/db/wedding-content-data", () => ({
  getWeddingSettings: mock(() =>
    Promise.resolve({
      coupleName: "Helen & Enrique",
      defaultLanguage: "en",
      emailFromName: "Helen & Enrique",
      emailFromAddress: "rsvp@test.com",
    }),
  ),
}));

// Mock the resend-client wrapper directly (the layer most sibling tests mock),
// capturing sendEmail calls. renderEmailTemplate stays real and reads the
// mocked db.emailTemplate.findUnique below.
const mockResendSend = mock(() =>
  Promise.resolve({ data: { id: "e1" }, error: null }),
);
mock.module("@/lib/email/resend-client", () => ({
  sendEmail: mockResendSend,
  getResendClient: mock(() => ({})),
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
const mockTemplateFindUnique = mock(() =>
  Promise.resolve({
    isActive: true,
    subject: "Thank you, {{{DONOR_NAME}}}!",
    htmlBody: "<p>{{{AMOUNT}}} toward {{{GIFT_TYPE}}} — {{{COUPLE_NAMES}}}</p>",
  } as unknown),
);
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
      findUnique: mockTemplateFindUnique,
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
    primaryEmailAddressId: "email-primary",
    emailAddresses: [
      {
        id: "email-primary",
        emailAddress: "admin@example.com",
        verification: { status: "verified" },
      },
    ],
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
    mockResendSend.mockClear();
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

  const donorGift = {
    id: "gift-1",
    weddingId: "test-wedding-id",
    thankYouEmailSent: false,
    donorEmail: "donor@example.com",
    donorName: "Pat Donor",
    amountCents: 15000,
    currency: "usd",
    giftType: "honeymoon",
  };

  it("emails the donor when the thank-you flag flips false -> true", async () => {
    mockGiftFindUnique.mockResolvedValue(donorGift as unknown);
    const { PATCH } = await import("@/app/api/admin/gifts/route");
    const res = await PATCH(
      patchRequest("http://localhost/api/admin/gifts", {
        id: "gift-1",
        thankYouEmailSent: true,
      }),
    );
    expect(res.status).toBe(200);
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const sent = mockResendSend.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(sent.to).toBe("donor@example.com");
    // rendered through the real template engine + amount/type formatting
    expect(sent.subject).toBe("Thank you, Pat Donor!");
    expect(sent.html).toContain("$150.00 toward Honeymoon Fund");
  });

  it("does not email if the gift was already thanked", async () => {
    mockGiftFindUnique.mockResolvedValue({
      ...donorGift,
      thankYouEmailSent: true,
    } as unknown);
    const { PATCH } = await import("@/app/api/admin/gifts/route");
    await PATCH(
      patchRequest("http://localhost/api/admin/gifts", {
        id: "gift-1",
        thankYouEmailSent: true,
      }),
    );
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("does not email if the donor has no email", async () => {
    mockGiftFindUnique.mockResolvedValue({
      ...donorGift,
      donorEmail: null,
    } as unknown);
    const { PATCH } = await import("@/app/api/admin/gifts/route");
    await PATCH(
      patchRequest("http://localhost/api/admin/gifts", {
        id: "gift-1",
        thankYouEmailSent: true,
      }),
    );
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("does not email when only editing notes", async () => {
    mockGiftFindUnique.mockResolvedValue(donorGift as unknown);
    const { PATCH } = await import("@/app/api/admin/gifts/route");
    await PATCH(
      patchRequest("http://localhost/api/admin/gifts", {
        id: "gift-1",
        notes: "updated",
      }),
    );
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("still returns 200 if the email send throws", async () => {
    mockGiftFindUnique.mockResolvedValue(donorGift as unknown);
    mockResendSend.mockRejectedValueOnce(new Error("resend down"));
    const { PATCH } = await import("@/app/api/admin/gifts/route");
    const res = await PATCH(
      patchRequest("http://localhost/api/admin/gifts", {
        id: "gift-1",
        thankYouEmailSent: true,
      }),
    );
    expect(res.status).toBe(200);
  });
});
