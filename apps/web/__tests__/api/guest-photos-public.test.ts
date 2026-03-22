import { beforeEach, describe, expect, it, mock } from "bun:test";

// ----- mock setup -----
mock.module("@/env", () => ({
  env: { ADMIN_EMAILS: "admin@example.com" },
}));

const mockGuestPhotoFindMany = mock(() => Promise.resolve([]));

mock.module("@/lib/db", () => ({
  db: {
    guestPhoto: {
      findMany: mockGuestPhotoFindMany,
    },
  },
}));

// No Clerk mock — this endpoint has no auth check

const MOCK_PHOTOS = [
  {
    id: "photo-1",
    url: "https://utfs.io/f/a.jpg",
    uploaderName: "Alice",
    isVisible: true,
    uploadedAt: new Date().toISOString(),
    hiddenAt: null,
    hiddenBy: null,
  },
  {
    id: "photo-2",
    url: "https://utfs.io/f/b.jpg",
    uploaderName: null,
    isVisible: true,
    uploadedAt: new Date().toISOString(),
    hiddenAt: null,
    hiddenBy: null,
  },
];

describe("GET /api/guest-photos", () => {
  beforeEach(() => {
    mockGuestPhotoFindMany.mockClear();
  });

  it("returns 200 with photos array when visible photos exist", async () => {
    mockGuestPhotoFindMany.mockResolvedValueOnce(MOCK_PHOTOS);

    const { GET } = await import("@/app/api/guest-photos/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.photos)).toBe(true);
    expect(data.photos).toHaveLength(2);
    expect(data.photos[0].id).toBe("photo-1");
    expect(data.photos[1].id).toBe("photo-2");
  });

  it("returns 200 with empty array when no visible photos exist", async () => {
    mockGuestPhotoFindMany.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/guest-photos/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.photos)).toBe(true);
    expect(data.photos).toHaveLength(0);
  });

  it("returns 500 on database error", async () => {
    mockGuestPhotoFindMany.mockRejectedValueOnce(
      new Error("DB connection failed"),
    );

    const { GET } = await import("@/app/api/guest-photos/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("returns photos array (not a nested object)", async () => {
    mockGuestPhotoFindMany.mockResolvedValueOnce(MOCK_PHOTOS);

    const { GET } = await import("@/app/api/guest-photos/route");
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty("photos");
    expect(data.photos).toBeInstanceOf(Array);
  });
});
