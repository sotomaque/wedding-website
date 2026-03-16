import { beforeEach, describe, expect, it, mock } from "bun:test";

// ----- mock setup -----
mock.module("@/env", () => ({
  env: { ADMIN_EMAILS: "admin@example.com" },
}));

const mockExecute = mock(() => Promise.resolve([]));

mock.module("@/lib/db", () => ({
  db: {
    selectFrom: () => ({
      selectAll: () => ({
        where: () => ({
          orderBy: () => ({ execute: mockExecute }),
        }),
      }),
    }),
  },
}));

// No Clerk mock — this endpoint has no auth check

const MOCK_PHOTOS = [
  {
    id: "photo-1",
    url: "https://utfs.io/f/a.jpg",
    uploader_name: "Alice",
    is_visible: true,
    uploaded_at: new Date().toISOString(),
    hidden_at: null,
    hidden_by: null,
  },
  {
    id: "photo-2",
    url: "https://utfs.io/f/b.jpg",
    uploader_name: null,
    is_visible: true,
    uploaded_at: new Date().toISOString(),
    hidden_at: null,
    hidden_by: null,
  },
];

describe("GET /api/guest-photos", () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  it("returns 200 with photos array when visible photos exist", async () => {
    mockExecute.mockResolvedValueOnce(MOCK_PHOTOS);

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
    mockExecute.mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/guest-photos/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.photos)).toBe(true);
    expect(data.photos).toHaveLength(0);
  });

  it("returns 500 on database error", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB connection failed"));

    const { GET } = await import("@/app/api/guest-photos/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("returns photos array (not a nested object)", async () => {
    mockExecute.mockResolvedValueOnce(MOCK_PHOTOS);

    const { GET } = await import("@/app/api/guest-photos/route");
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty("photos");
    expect(data.photos).toBeInstanceOf(Array);
  });
});
