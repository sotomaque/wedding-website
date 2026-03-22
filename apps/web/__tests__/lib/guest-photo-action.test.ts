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

// ----- mock setup -----
const mockInsertValues = mock((_data: unknown) => {});
const mockExecute = mock(() => Promise.resolve());

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

const mockDb = {
  insertInto: () =>
    createChainableDb({
      values: (data: unknown) => {
        mockInsertValues(data);
        return createChainableDb({ execute: mockExecute });
      },
    }),
  selectFrom: () => createChainableDb({ execute: mockExecute }),
  updateTable: () => createChainableDb({ execute: mockExecute }),
  deleteFrom: () => createChainableDb({ execute: mockExecute }),
};

mock.module("@/lib/db", () => ({ db: mockDb }));
mock.module("@/lib/db/scoped", () => ({
  forWedding: () => mockDb,
}));

// No Clerk mock — saveGuestPhoto has no auth check

describe("saveGuestPhoto server action", () => {
  beforeEach(() => {
    mockInsertValues.mockClear();
    mockExecute.mockClear();
  });

  it("returns { success: true } when the insert succeeds", async () => {
    const { saveGuestPhoto } = await import("@/app/[slug]/photos/actions");
    const result = await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("inserts with correct url and uploader_name", async () => {
    const { saveGuestPhoto } = await import("@/app/[slug]/photos/actions");
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Bob");

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://utfs.io/f/photo.jpg",
        uploader_name: "Bob",
      }),
    );
  });

  it("always inserts with is_visible: true", async () => {
    const { saveGuestPhoto } = await import("@/app/[slug]/photos/actions");
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice");

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ is_visible: true }),
    );
  });

  it("stores null for uploader_name when empty string is passed", async () => {
    const { saveGuestPhoto } = await import("@/app/[slug]/photos/actions");
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", "");

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ uploader_name: null }),
    );
  });

  it("stores null for uploader_name when null is passed", async () => {
    const { saveGuestPhoto } = await import("@/app/[slug]/photos/actions");
    await saveGuestPhoto("https://utfs.io/f/photo.jpg", null);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ uploader_name: null }),
    );
  });

  it("returns { success: false, error } on database error", async () => {
    mockExecute.mockRejectedValueOnce(new Error("connection refused"));

    const { saveGuestPhoto } = await import("@/app/[slug]/photos/actions");
    const result = await saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to save photo");
  });

  it("does not throw when the database errors", async () => {
    mockExecute.mockRejectedValueOnce(new Error("fail"));

    const { saveGuestPhoto } = await import("@/app/[slug]/photos/actions");

    // Should resolve (not reject)
    await expect(
      saveGuestPhoto("https://utfs.io/f/photo.jpg", "Alice"),
    ).resolves.toBeDefined();
  });
});
