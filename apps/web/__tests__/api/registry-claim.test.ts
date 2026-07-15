import { beforeEach, describe, expect, it, mock } from "bun:test";
import * as nextServer from "next/server";

mock.module("@/env", () => ({ env: { RESEND_API_KEY: "test-key" } }));

// Mock next/server's after() to run + await the callback so the notification
// send completes before assertions. (Matches submit.test.ts — only `after`.)
const afterTasks: Promise<unknown>[] = [];
// Spread the real module so NextRequest/NextResponse stay exported. `mock.module`
// is process-global under `bun test`; a partial stub bleeds into sibling files
// that import NextRequest and breaks them on load with a missing-export error.
mock.module("next/server", () => ({
  ...nextServer,
  after: (fn: () => unknown) => {
    afterTasks.push(Promise.resolve().then(fn));
  },
}));

async function flushAfter() {
  await Promise.all(afterTasks);
  afterTasks.length = 0;
}

mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
}));

mock.module("@/lib/db/wedding-content-data", () => ({
  getWeddingSettings: mock(() =>
    Promise.resolve({
      slug: "test-wedding",
      coupleName: "Helen & Enrique",
      defaultLanguage: "en",
      notificationEmails: "admin@example.com",
    }),
  ),
}));

mock.module("@/lib/url", () => ({
  weddingUrl: (slug: string, path: string) => `https://x/${slug}${path}`,
}));

mock.module("@/lib/email/helpers", () => ({
  getEmailFromAddress: () => "Helen & Enrique <rsvp@test.com>",
  getNotificationRecipients: () => ["admin@example.com"],
}));

// Mock the resend-client wrapper (the layer sibling tests mock) — NOT
// render-template (mocking that would clobber render-template.test.ts under
// the shared in-process test run). renderEmailTemplate stays real and reads
// the mocked db.emailTemplate.findUnique below.
const mockSendEmail = mock(() =>
  Promise.resolve({ data: { id: "e1" }, error: null }),
);
mock.module("@/lib/email/resend-client", () => ({
  sendEmail: mockSendEmail,
  getResendClient: () => ({}),
}));

// updateMany returns { count } — 1 when the conditional WHERE matched, 0 when
// the item was already claimed / not a product / wrong wedding.
const mockUpdateMany = mock(() => Promise.resolve({ count: 1 }));
const mockFindFirst = mock(() => Promise.resolve({ title: "Blender" }));
// renderEmailTemplate (real) calls emailTemplate.findUnique.
const mockTemplateFindUnique = mock(() =>
  Promise.resolve({
    isActive: true,
    subject: "Gift claimed: {{{ITEM_TITLE}}}",
    htmlBody: "<p>{{{CLAIMANT_NAME}}} — {{{ITEM_TITLE}}}</p>",
  } as unknown),
);
mock.module("@/lib/db", () => ({
  db: {
    registryItem: { updateMany: mockUpdateMany, findFirst: mockFindFirst },
    emailTemplate: { findUnique: mockTemplateFindUnique },
  },
}));

function jsonReq(method: string, body: unknown): Request {
  return new Request("http://localhost/api/registry/claim", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/registry/claim", () => {
  beforeEach(() => {
    mockUpdateMany.mockClear();
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockSendEmail.mockClear();
  });

  it("claims an available product item", async () => {
    const { POST } = await import("@/app/api/registry/claim/route");
    const res = await POST(
      jsonReq("POST", {
        itemId: "item-1",
        name: "Pat Guest",
        email: "Pat@Example.com",
      }),
    );
    expect(res.status).toBe(200);
    const where = mockUpdateMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      id: "item-1",
      weddingId: "test-wedding-id",
      itemType: "product",
      isActive: true,
      claimedAt: null,
    });
    // email is lowercased before storing
    expect(mockUpdateMany.mock.calls[0][0].data.claimedByEmail).toBe(
      "pat@example.com",
    );
  });

  it("sends an admin notification after a successful claim", async () => {
    const { POST } = await import("@/app/api/registry/claim/route");
    await POST(
      jsonReq("POST", {
        itemId: "item-1",
        name: "Pat Guest",
        email: "pat@example.com",
      }),
    );
    await flushAfter();
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const sent = mockSendEmail.mock.calls[0][0] as {
      to: string[];
      subject: string;
      html: string;
    };
    expect(sent.to).toEqual(["admin@example.com"]);
    // rendered through the real template engine with the claim details
    expect(sent.subject).toBe("Gift claimed: Blender");
    expect(sent.html).toContain("Pat Guest");
    expect(sent.html).toContain("Blender");
  });

  it("does not notify when the claim fails (409)", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const { POST } = await import("@/app/api/registry/claim/route");
    await POST(
      jsonReq("POST", { itemId: "item-1", name: "Pat", email: "p@e.com" }),
    );
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 409 when the item is already claimed (no rows matched)", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const { POST } = await import("@/app/api/registry/claim/route");
    const res = await POST(
      jsonReq("POST", {
        itemId: "item-1",
        name: "Pat",
        email: "pat@example.com",
      }),
    );
    expect(res.status).toBe(409);
  });

  it("rejects invalid input (missing email)", async () => {
    const { POST } = await import("@/app/api/registry/claim/route");
    const res = await POST(jsonReq("POST", { itemId: "item-1", name: "Pat" }));
    expect(res.status).toBe(400);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const { POST } = await import("@/app/api/registry/claim/route");
    const res = await POST(
      jsonReq("POST", { itemId: "item-1", name: "Pat", email: "nope" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/registry/claim", () => {
  beforeEach(() => {
    mockUpdateMany.mockClear();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("releases a claim matching the claimant email", async () => {
    const { DELETE } = await import("@/app/api/registry/claim/route");
    const res = await DELETE(
      jsonReq("DELETE", { itemId: "item-1", email: "Pat@Example.com" }),
    );
    expect(res.status).toBe(200);
    expect(mockUpdateMany.mock.calls[0][0].where).toMatchObject({
      id: "item-1",
      weddingId: "test-wedding-id",
      claimedByEmail: "pat@example.com",
    });
  });

  it("returns 404 when no claim matches that email", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const { DELETE } = await import("@/app/api/registry/claim/route");
    const res = await DELETE(
      jsonReq("DELETE", { itemId: "item-1", email: "someone@else.com" }),
    );
    expect(res.status).toBe(404);
  });
});
