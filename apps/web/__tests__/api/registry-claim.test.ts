import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("@/env", () => ({ env: {} }));

mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
}));

// updateMany returns { count } — 1 when the conditional WHERE matched, 0 when
// the item was already claimed / not a product / wrong wedding.
const mockUpdateMany = mock(() => Promise.resolve({ count: 1 }));
mock.module("@/lib/db", () => ({
  db: { registryItem: { updateMany: mockUpdateMany } },
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
