import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// Mock wedding context - must be before any imports that use getWeddingId
mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: () => Promise.resolve("test-wedding-id"),
  getWeddingContext: () =>
    Promise.resolve({
      weddingId: "test-wedding-id",
      slug: "test-wedding",
      coupleName: "Test Couple",
      weddingDate: "2026-07-30",
      rsvpDeadline: null,
      timezone: "America/New_York",
      status: "published",
    }),
  getWeddingBySlug: () => Promise.resolve(null),
  getWeddingById: () => Promise.resolve(null),
}));

// ----- mock setup -----
mock.module("@/env", () => ({
  env: { ADMIN_EMAILS: "admin@example.com" },
}));

const mockCurrentUser = mock(() => Promise.resolve(null));
mock.module("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
}));

const mockExecute = mock(() => Promise.resolve([]));
// Chainable db mock
function createChainableDb(terminals: Record<string, unknown> = {}) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: (_, prop: string) => {
      if (prop in terminals) return terminals[prop];
      return (...args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

mock.module("@/lib/db", () => ({
  db: {
    selectFrom: () => createChainableDb({ execute: mockExecute }),
  },
}));

// ----- global fetch mock -----
const fakeImageBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer;
const mockFetch = mock(() =>
  Promise.resolve(
    new Response(fakeImageBuffer, {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    }),
  ),
);

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockClear();
  mockCurrentUser.mockClear();
  mockExecute.mockClear();
});

afterEach(() => {
  global.fetch = originalFetch;
});

// ----- helpers -----
const ADMIN = {
  id: "u1",
  emailAddresses: [{ emailAddress: "admin@example.com" }],
};
const GUEST = {
  id: "u2",
  emailAddresses: [{ emailAddress: "guest@example.com" }],
};

const MOCK_PHOTOS = [
  {
    id: "p1",
    url: "https://utfs.io/f/a.jpg",
    uploader_name: "Alice",
    uploaded_at: new Date(),
  },
  {
    id: "p2",
    url: "https://utfs.io/f/b.jpg",
    uploader_name: null,
    uploaded_at: new Date(),
  },
];

function makeReq() {
  return new Request("http://localhost/api/admin/guest-photos/download");
}

// ----- tests -----
describe("GET /api/admin/guest-photos/download", () => {
  describe("auth guard", () => {
    it("returns 401 when unauthenticated", async () => {
      mockCurrentUser.mockResolvedValueOnce(null);

      const { GET } = await import(
        "@/app/api/admin/guest-photos/download/route"
      );
      const response = await GET(makeReq() as never);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when user is not admin", async () => {
      mockCurrentUser.mockResolvedValueOnce(GUEST);

      const { GET } = await import(
        "@/app/api/admin/guest-photos/download/route"
      );
      const response = await GET(makeReq() as never);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("empty state", () => {
    it("returns 404 when no photos exist", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecute.mockResolvedValueOnce([]);

      const { GET } = await import(
        "@/app/api/admin/guest-photos/download/route"
      );
      const response = await GET(makeReq() as never);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("No photos to download");
    });
  });

  describe("successful download", () => {
    it("returns 200 with correct ZIP headers", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecute.mockResolvedValueOnce(MOCK_PHOTOS);

      const { GET } = await import(
        "@/app/api/admin/guest-photos/download/route"
      );
      const response = await GET(makeReq() as never);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/zip");
      expect(response.headers.get("Content-Disposition")).toContain(
        "guest-photos.zip",
      );
      expect(Number(response.headers.get("Content-Length"))).toBeGreaterThan(0);
    });

    it("returns non-empty body", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecute.mockResolvedValueOnce(MOCK_PHOTOS);

      const { GET } = await import(
        "@/app/api/admin/guest-photos/download/route"
      );
      const response = await GET(makeReq() as never);
      const buffer = await response.arrayBuffer();

      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe("resilience", () => {
    it("still returns ZIP when one photo URL fetch fails", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecute.mockResolvedValueOnce(MOCK_PHOTOS);

      // First fetch returns 404, second returns the image
      mockFetch
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(
          new Response(fakeImageBuffer, {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
        );

      const { GET } = await import(
        "@/app/api/admin/guest-photos/download/route"
      );
      const response = await GET(makeReq() as never);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/zip");
    });
  });

  describe("database error", () => {
    it("returns 500 on database error", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecute.mockRejectedValueOnce(new Error("DB connection refused"));

      const { GET } = await import(
        "@/app/api/admin/guest-photos/download/route"
      );
      const response = await GET(makeReq() as never);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
