import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com,admin2@example.com",
  },
}));

mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
  getWeddingContext: mock(() =>
    Promise.resolve({
      weddingId: "test-wedding-id",
      slug: "test-wedding",
      coupleName: "Test Couple",
      weddingDate: new Date("2026-07-30"),
      rsvpDeadline: null,
      timezone: "America/New_York",
      status: "published",
    }),
  ),
}));

// next/cache — assert revalidation fires on mutation.
const mockRevalidatePath = mock((_path: string, _type?: string) => undefined);
mock.module("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

const mockPhotoFindUnique = mock((_args?: unknown) =>
  Promise.resolve({
    id: "photo-1",
    weddingId: "test-wedding-id",
    url: "https://example.com/photo1.jpg",
    alt: "Photo 1",
  }),
);
const mockPlacementAggregate = mock(() =>
  Promise.resolve({ _max: { displayOrder: 2 } }),
);
const mockPlacementUpsert = mock((_args?: unknown) =>
  Promise.resolve({
    id: "placement-new",
    photoId: "photo-1",
    section: "hero",
    displayOrder: 3,
  }),
);
const mockPlacementFindUnique = mock((_args?: unknown) =>
  Promise.resolve({
    id: "placement-1",
    weddingId: "test-wedding-id",
    section: "hero",
  }),
);
const mockPlacementCount = mock(() => Promise.resolve(0));
const mockPlacementDelete = mock((_args?: unknown) =>
  Promise.resolve({ id: "placement-1" }),
);

mock.module("@/lib/db", () => ({
  db: {
    photo: { findUnique: mockPhotoFindUnique },
    photoPlacement: {
      aggregate: mockPlacementAggregate,
      upsert: mockPlacementUpsert,
      findUnique: mockPlacementFindUnique,
      count: mockPlacementCount,
      delete: mockPlacementDelete,
    },
    weddingAdmin: { findFirst: mock(() => Promise.resolve(null)) },
  },
}));

const mockCurrentUser = mock(() => Promise.resolve(null));
mock.module("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
}));

const adminUser = {
  id: "admin-1",
  primaryEmailAddressId: "email-primary",
  emailAddresses: [
    {
      id: "email-primary",
      emailAddress: "admin@example.com",
      verification: { status: "verified" },
    },
  ],
};

describe("POST /api/admin/photos/placements", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
    mockRevalidatePath.mockClear();
    mockPlacementUpsert.mockClear();
    mockPlacementAggregate.mockClear();
    mockPlacementCount.mockClear();
    mockPhotoFindUnique.mockResolvedValue({
      id: "photo-1",
      weddingId: "test-wedding-id",
      url: "https://example.com/photo1.jpg",
      alt: "Photo 1",
    });
  });

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/admin/photos/placements", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not authenticated", async () => {
    mockCurrentUser.mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/photos/placements/route");

    const response = await POST(
      makeRequest({ photoId: "photo-1", section: "hero" }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
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
    const { POST } = await import("@/app/api/admin/photos/placements/route");

    const response = await POST(
      makeRequest({ photoId: "photo-1", section: "hero" }),
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for an invalid section", async () => {
    mockCurrentUser.mockResolvedValue(adminUser);
    const { POST } = await import("@/app/api/admin/photos/placements/route");

    const response = await POST(
      makeRequest({ photoId: "photo-1", section: "footer" }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 when the photo belongs to another wedding", async () => {
    mockCurrentUser.mockResolvedValue(adminUser);
    mockPhotoFindUnique.mockResolvedValueOnce({
      id: "photo-1",
      weddingId: "other-wedding",
      url: "x",
      alt: "x",
    });
    const { POST } = await import("@/app/api/admin/photos/placements/route");

    const response = await POST(
      makeRequest({ photoId: "photo-1", section: "hero" }),
    );

    expect(response.status).toBe(404);
  });

  it("appends at max+1, upserts idempotently, and revalidates", async () => {
    mockCurrentUser.mockResolvedValue(adminUser);
    const { POST } = await import("@/app/api/admin/photos/placements/route");

    const response = await POST(
      makeRequest({ photoId: "photo-1", section: "hero" }),
    );

    expect(response.status).toBe(201);
    const upsertArgs = mockPlacementUpsert.mock.calls[0]?.[0] as {
      where: unknown;
      create: { displayOrder: number };
    };
    expect(upsertArgs.where).toEqual({
      photoId_section: { photoId: "photo-1", section: "hero" },
    });
    expect(upsertArgs.create.displayOrder).toBe(3); // max (2) + 1
    expect(mockRevalidatePath).toHaveBeenCalledWith("/test-wedding", "layout");
  });

  it("refuses to exceed the hero cap (returns 400, no upsert)", async () => {
    mockCurrentUser.mockResolvedValue(adminUser);
    // Photo not yet placed in hero, and hero is already at its cap (8).
    mockPlacementFindUnique.mockResolvedValueOnce(null);
    mockPlacementCount.mockResolvedValueOnce(8);
    const { POST } = await import("@/app/api/admin/photos/placements/route");

    const response = await POST(
      makeRequest({ photoId: "photo-1", section: "hero" }),
    );

    expect(response.status).toBe(400);
    expect(mockPlacementUpsert).not.toHaveBeenCalled();
  });

  it("allows unlimited gallery placements (no cap check blocks)", async () => {
    mockCurrentUser.mockResolvedValue(adminUser);
    const { POST } = await import("@/app/api/admin/photos/placements/route");

    const response = await POST(
      makeRequest({ photoId: "photo-1", section: "gallery" }),
    );

    expect(response.status).toBe(201);
    // gallery is uncapped, so no count gate is consulted
    expect(mockPlacementCount).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/photos/placements/[id]", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
    mockRevalidatePath.mockClear();
    mockPlacementDelete.mockClear();
    mockPlacementFindUnique.mockResolvedValue({
      id: "placement-1",
      weddingId: "test-wedding-id",
      section: "hero",
    });
  });

  const ctx = { params: Promise.resolve({ id: "placement-1" }) };

  it("returns 404 for a placement owned by another wedding", async () => {
    mockCurrentUser.mockResolvedValue(adminUser);
    mockPlacementFindUnique.mockResolvedValueOnce({
      id: "placement-1",
      weddingId: "other-wedding",
      section: "hero",
    });
    const { DELETE } = await import(
      "@/app/api/admin/photos/placements/[id]/route"
    );

    const request = new Request("http://localhost", { method: "DELETE" });
    const response = await DELETE(request, ctx);

    expect(response.status).toBe(404);
    expect(mockPlacementDelete).not.toHaveBeenCalled();
  });

  it("deletes the placement and revalidates", async () => {
    mockCurrentUser.mockResolvedValue(adminUser);
    const { DELETE } = await import(
      "@/app/api/admin/photos/placements/[id]/route"
    );

    const request = new Request("http://localhost", { method: "DELETE" });
    const response = await DELETE(request, ctx);

    expect(response.status).toBe(200);
    expect(mockPlacementDelete).toHaveBeenCalledWith({
      where: { id: "placement-1" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/test-wedding", "layout");
  });
});
