import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock photo data
const mockPhotos = [
  {
    id: "photo-1",
    url: "https://example.com/photo1.jpg",
    alt: "Photo 1",
    description: "Description 1",
    displayOrder: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "photo-2",
    url: "https://example.com/photo2.jpg",
    alt: "Photo 2",
    description: "Description 2",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "photo-3",
    url: "https://example.com/photo3.jpg",
    alt: "Photo 3",
    description: null,
    displayOrder: 2,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock the env module
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com,admin2@example.com",
  },
}));

// Mock wedding context (must be before @/lib/db mock)
mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
  getWeddingContext: mock(() =>
    Promise.resolve({
      weddingId: "test-wedding-id",
      slug: "test-wedding",
      coupleName: "Test Couple",
      weddingDate: new Date("2026-07-30"),
      rsvpDeadline: "March 30th, 2026",
      timezone: "America/New_York",
      status: "published",
    }),
  ),
}));

// Mock the db module
const mockPhotoFindMany = mock(() =>
  Promise.resolve(mockPhotos.filter((p) => p.isActive)),
);
const mockPhotoCreate = mock(() => Promise.resolve(mockPhotos[0]));
const mockPhotoAggregate = mock(() =>
  Promise.resolve({ _max: { displayOrder: 2 } }),
);

mock.module("@/lib/db", () => ({
  db: {
    photo: {
      findMany: mockPhotoFindMany,
      create: mockPhotoCreate,
      aggregate: mockPhotoAggregate,
    },
    weddingAdmin: {
      findFirst: mock(() => Promise.resolve(null)),
    },
  },
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
    mockPhotoFindMany.mockClear();
    mockPhotoCreate.mockClear();
    // Reset findMany to return all photos for admin
    mockPhotoFindMany.mockResolvedValue(mockPhotos);
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
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "user@example.com",
            verification: { status: "verified" },
          },
        ],
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
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "admin@example.com",
            verification: { status: "verified" },
          },
        ],
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
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "user@example.com",
            verification: { status: "verified" },
          },
        ],
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
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "admin@example.com",
            verification: { status: "verified" },
          },
        ],
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
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "admin@example.com",
            verification: { status: "verified" },
          },
        ],
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
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "admin@example.com",
            verification: { status: "verified" },
          },
        ],
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
