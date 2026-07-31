import { beforeEach, describe, expect, it, mock } from "bun:test";

// ----- mock setup -----
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

const mockGuestPhotoCreate = mock(() => Promise.resolve({}));

mock.module("@/lib/db", () => ({
  db: {
    guestPhoto: {
      create: mockGuestPhotoCreate,
    },
  },
}));

// No Clerk mock — saveGuestPhoto has no auth check

describe("saveGuestPhoto server action", () => {
  beforeEach(() => {
    mockGuestPhotoCreate.mockClear();
  });

  it("returns { success: true } when the insert succeeds", async () => {
    const { saveGuestPhoto } = await import(
      "@/app/[slug]/(public)/photos/actions"
    );
    const result = await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects a non-UploadThing URL without inserting (SSRF guard)", async () => {
    const { saveGuestPhoto } = await import(
      "@/app/[slug]/(public)/photos/actions"
    );
    const result = await saveGuestPhoto(
      "http://169.254.169.254/latest/meta-data/",
      "attacker",
    );

    expect(result.success).toBe(false);
    expect(mockGuestPhotoCreate).not.toHaveBeenCalled();
  });

  it("inserts with correct url and uploaderName", async () => {
    const { saveGuestPhoto } = await import(
      "@/app/[slug]/(public)/photos/actions"
    );
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Bob");

    expect(mockGuestPhotoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          url: "https://utfs.io/f/photo.jpg",
          uploaderName: "Bob",
        }),
      }),
    );
  });

  it("inserts hidden (isVisible: false) for the moderation queue", async () => {
    const { saveGuestPhoto } = await import(
      "@/app/[slug]/(public)/photos/actions"
    );
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice");

    expect(mockGuestPhotoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isVisible: false }),
      }),
    );
  });

  it("stores null for uploaderName when empty string is passed", async () => {
    const { saveGuestPhoto } = await import(
      "@/app/[slug]/(public)/photos/actions"
    );
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", "");

    expect(mockGuestPhotoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uploaderName: null }),
      }),
    );
  });

  it("stores null for uploaderName when null is passed", async () => {
    const { saveGuestPhoto } = await import(
      "@/app/[slug]/(public)/photos/actions"
    );
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", null);

    expect(mockGuestPhotoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uploaderName: null }),
      }),
    );
  });

  it("returns { success: false, error } on database error", async () => {
    mockGuestPhotoCreate.mockRejectedValueOnce(new Error("connection refused"));

    const { saveGuestPhoto } = await import(
      "@/app/[slug]/(public)/photos/actions"
    );
    const result = await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to save photo");
  });

  it("does not throw when the database errors", async () => {
    mockGuestPhotoCreate.mockRejectedValueOnce(new Error("fail"));

    const { saveGuestPhoto } = await import(
      "@/app/[slug]/(public)/photos/actions"
    );

    // Should resolve (not reject)
    await expect(
      saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice"),
    ).resolves.toBeDefined();
  });
});
