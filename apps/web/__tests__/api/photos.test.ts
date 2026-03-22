import { beforeEach, describe, expect, it, mock } from "bun:test";

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

// Mock photo data
const mockPhotos = [
  {
    id: "photo-1",
    url: "https://example.com/photo1.jpg",
    alt: "Photo 1",
    description: "Description 1",
    display_order: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "photo-2",
    url: "https://example.com/photo2.jpg",
    alt: "Photo 2",
    description: "Description 2",
    display_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "photo-3",
    url: "https://example.com/photo3.jpg",
    alt: "Photo 3",
    description: null,
    display_order: 2,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Mock the env module
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com,admin2@example.com",
  },
}));

// Mock the db module - chainable proxy
function createChainableDb(terminals: Record<string, unknown> = {}) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: (_, prop: string) => {
      if (prop in terminals) return terminals[prop];
      return (...args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const mockExecute = mock(() =>
  Promise.resolve(mockPhotos.filter((p) => p.is_active)),
);
const mockExecuteTakeFirst = mock(() => Promise.resolve(mockPhotos[0]));

const terminalMethods = {
  execute: mockExecute,
  executeTakeFirst: mockExecuteTakeFirst,
  executeTakeFirstOrThrow: mockExecuteTakeFirst,
};

const mockDb = {
  selectFrom: () => createChainableDb(terminalMethods),
  insertInto: () => createChainableDb(terminalMethods),
  updateTable: () => createChainableDb(terminalMethods),
  deleteFrom: () => createChainableDb(terminalMethods),
  fn: {
    max: () => ({ as: () => "max_order" }),
  },
};

mock.module("@/lib/db", () => ({ db: mockDb }));
mock.module("@/lib/db/scoped", () => ({
  forWedding: () => mockDb,
}));

// Mock Clerk
const mockCurrentUser = mock(() => Promise.resolve(null));

mock.module("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
}));

describe("Public Photos API", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
  });

  describe("GET /api/photos", () => {
    it("should return active photos", async () => {
      const { GET: getPublicPhotos } = await import("@/app/api/photos/route");

      const response = await getPublicPhotos();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photos).toBeDefined();
      expect(Array.isArray(data.photos)).toBe(true);
    });

    it("should return photos array in response", async () => {
      const { GET: getPublicPhotos } = await import("@/app/api/photos/route");

      const response = await getPublicPhotos();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.photos)).toBe(true);
    });
  });
});

describe("Admin Photos API", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
  });

  describe("GET /api/admin/photos", () => {
    it("should return 401 when not authenticated", async () => {
      mockCurrentUser.mockResolvedValue(null);

      const { GET: getAdminPhotos } = await import(
        "@/app/api/admin/photos/route"
      );

      const response = await getAdminPhotos();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "user-1",
        emailAddresses: [{ emailAddress: "user@example.com" }],
      });

      const { GET: getAdminPhotos } = await import(
        "@/app/api/admin/photos/route"
      );

      const response = await getAdminPhotos();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return photos when user is admin", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "admin-1",
        emailAddresses: [{ emailAddress: "admin@example.com" }],
      });

      const { GET: getAdminPhotos } = await import(
        "@/app/api/admin/photos/route"
      );

      const response = await getAdminPhotos();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photos).toBeDefined();
    });
  });

  describe("POST /api/admin/photos", () => {
    it("should return 401 when not authenticated", async () => {
      mockCurrentUser.mockResolvedValue(null);

      const { POST: createPhoto } = await import(
        "@/app/api/admin/photos/route"
      );

      const request = new Request("http://localhost/api/admin/photos", {
        method: "POST",
        body: JSON.stringify({
          url: "https://example.com/new.jpg",
          alt: "New photo",
        }),
      });

      const response = await createPhoto(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "user-1",
        emailAddresses: [{ emailAddress: "user@example.com" }],
      });

      const { POST: createPhoto } = await import(
        "@/app/api/admin/photos/route"
      );

      const request = new Request("http://localhost/api/admin/photos", {
        method: "POST",
        body: JSON.stringify({
          url: "https://example.com/new.jpg",
          alt: "New photo",
        }),
      });

      const response = await createPhoto(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 400 when url is missing", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "admin-1",
        emailAddresses: [{ emailAddress: "admin@example.com" }],
      });

      const { POST: createPhoto } = await import(
        "@/app/api/admin/photos/route"
      );

      const request = new Request("http://localhost/api/admin/photos", {
        method: "POST",
        body: JSON.stringify({ alt: "New photo" }),
      });

      const response = await createPhoto(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("URL and alt text are required");
    });

    it("should return 400 when alt is missing", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "admin-1",
        emailAddresses: [{ emailAddress: "admin@example.com" }],
      });

      const { POST: createPhoto } = await import(
        "@/app/api/admin/photos/route"
      );

      const request = new Request("http://localhost/api/admin/photos", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/new.jpg" }),
      });

      const response = await createPhoto(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("URL and alt text are required");
    });

    it("should create photo when valid data is provided by admin", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "admin-1",
        emailAddresses: [{ emailAddress: "admin@example.com" }],
      });

      const { POST: createPhoto } = await import(
        "@/app/api/admin/photos/route"
      );

      const request = new Request("http://localhost/api/admin/photos", {
        method: "POST",
        body: JSON.stringify({
          url: "https://example.com/new.jpg",
          alt: "New photo",
          description: "A new photo",
        }),
      });

      const response = await createPhoto(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.photo).toBeDefined();
    });
  });
});
