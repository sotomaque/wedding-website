import { beforeEach, describe, expect, it, mock } from "bun:test";

// ----- mock setup -----
const mockInsertValues = mock((_data: unknown) => {});
const mockExecute = mock(() => Promise.resolve());

mock.module("@/lib/db", () => ({
  db: {
    insertInto: () => ({
      values: (data: unknown) => {
        mockInsertValues(data);
        return { execute: mockExecute };
      },
    }),
  },
}));

// No Clerk mock — saveGuestPhoto has no auth check

describe("saveGuestPhoto server action", () => {
  beforeEach(() => {
    mockInsertValues.mockClear();
    mockExecute.mockClear();
  });

  it("returns { success: true } when the insert succeeds", async () => {
    const { saveGuestPhoto } = await import("@/app/photos/actions");
    const result = await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("inserts with correct url and uploader_name", async () => {
    const { saveGuestPhoto } = await import("@/app/photos/actions");
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Bob");

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://utfs.io/f/photo.jpg",
        uploader_name: "Bob",
      }),
    );
  });

  it("always inserts with is_visible: true", async () => {
    const { saveGuestPhoto } = await import("@/app/photos/actions");
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice");

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ is_visible: true }),
    );
  });

  it("stores null for uploader_name when empty string is passed", async () => {
    const { saveGuestPhoto } = await import("@/app/photos/actions");
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", "");

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ uploader_name: null }),
    );
  });

  it("stores null for uploader_name when null is passed", async () => {
    const { saveGuestPhoto } = await import("@/app/photos/actions");
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", null);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ uploader_name: null }),
    );
  });

  it("returns { success: false, error } on database error", async () => {
    mockExecute.mockRejectedValueOnce(new Error("connection refused"));

    const { saveGuestPhoto } = await import("@/app/photos/actions");
    const result = await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to save photo");
  });

  it("does not throw when the database errors", async () => {
    mockExecute.mockRejectedValueOnce(new Error("fail"));

    const { saveGuestPhoto } = await import("@/app/photos/actions");

    // Should resolve (not reject)
    await expect(
      saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice"),
    ).resolves.toBeDefined();
  });
});
