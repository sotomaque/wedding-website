import { beforeEach, describe, expect, it, mock } from "bun:test";

// Placements joined to their parent photo, ordered by displayOrder, as the
// query in getPhotosBySection returns them.
const mockPlacements = [
  {
    id: "placement-1",
    photoId: "photo-1",
    section: "hero",
    displayOrder: 0,
    photo: {
      id: "photo-1",
      url: "https://example.com/photo1.jpg",
      alt: "Photo 1",
      description: "Caption 1",
      isActive: true,
    },
  },
  {
    id: "placement-2",
    photoId: "photo-2",
    section: "hero",
    displayOrder: 1,
    photo: {
      id: "photo-2",
      url: "https://example.com/photo2.jpg",
      alt: "Photo 2",
      description: null,
      isActive: true,
    },
  },
];

mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
  getWeddingContext: mock(() =>
    Promise.resolve({ weddingId: "test-wedding-id", slug: "test-wedding" }),
  ),
}));

const mockPlacementFindMany = mock(
  (_args?: unknown): Promise<unknown[]> => Promise.resolve(mockPlacements),
);

mock.module("@/lib/db", () => ({
  db: {
    photoPlacement: {
      findMany: mockPlacementFindMany,
    },
  },
}));

describe("getPhotosBySection", () => {
  beforeEach(() => {
    mockPlacementFindMany.mockClear();
    mockPlacementFindMany.mockResolvedValue(mockPlacements);
  });

  it("returns placed photos as HeroPhoto[] in displayOrder", async () => {
    const { getPhotosBySection } = await import("@/lib/photos");

    const result = await getPhotosBySection("hero");

    expect(result).toEqual([
      {
        src: "https://example.com/photo1.jpg",
        alt: "Photo 1",
        description: "Caption 1",
      },
      {
        // description is null → falls back to alt
        src: "https://example.com/photo2.jpg",
        alt: "Photo 2",
        description: "Photo 2",
      },
    ]);
  });

  it("queries the requested section, scoped to the wedding, ordered by displayOrder", async () => {
    const { getPhotosBySection } = await import("@/lib/photos");

    await getPhotosBySection("gallery");

    const callArgs = mockPlacementFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
    };
    expect(callArgs.where.section).toBe("gallery");
    expect(callArgs.where.weddingId).toBe("test-wedding-id");
    expect(callArgs.orderBy).toEqual({ displayOrder: "asc" });
  });

  it("gates visibility purely on placement (no isActive filter)", async () => {
    const { getPhotosBySection } = await import("@/lib/photos");

    await getPhotosBySection("hero");

    const callArgs = mockPlacementFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(callArgs.where.photo).toBeUndefined();
  });

  it("returns an empty array when the query throws", async () => {
    mockPlacementFindMany.mockRejectedValueOnce(new Error("db down"));
    const { getPhotosBySection } = await import("@/lib/photos");

    const result = await getPhotosBySection("story");

    expect(result).toEqual([]);
  });
});
