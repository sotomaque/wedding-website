import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

// ----- mock setup -----
mock.module("@/env", () => ({
  env: { ADMIN_EMAILS: "admin@example.com" },
}));

const mockCurrentUser = mock(() => Promise.resolve(null));
mock.module("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
}));

const mockExecuteTakeFirst = mock(() => Promise.resolve(null));

mock.module("@/lib/db", () => ({
  db: {
    updateTable: () => ({
      set: () => ({
        where: () => ({
          returningAll: () => ({ executeTakeFirst: mockExecuteTakeFirst }),
        }),
      }),
    }),
    deleteFrom: () => ({
      where: () => ({
        returningAll: () => ({ executeTakeFirst: mockExecuteTakeFirst }),
      }),
    }),
  },
}));

// ----- helpers -----
const ADMIN = {
  id: "u1",
  emailAddresses: [{ emailAddress: "admin@example.com" }],
};
const GUEST = {
  id: "u2",
  emailAddresses: [{ emailAddress: "guest@example.com" }],
};

function makeReq(method: string, body?: object): NextRequest {
  return new NextRequest("http://localhost/api/admin/guest-photos/photo-123", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const PARAMS = { params: Promise.resolve({ id: "photo-123" }) };

// ----- PATCH tests -----
describe("PATCH /api/admin/guest-photos/[id]", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
    mockExecuteTakeFirst.mockClear();
  });

  describe("auth guard", () => {
    it("returns 401 when unauthenticated", async () => {
      mockCurrentUser.mockResolvedValueOnce(null);

      const { PATCH } = await import("@/app/api/admin/guest-photos/[id]/route");
      const response = await PATCH(
        makeReq("PATCH", { is_visible: false }),
        PARAMS,
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when user is not admin", async () => {
      mockCurrentUser.mockResolvedValueOnce(GUEST);

      const { PATCH } = await import("@/app/api/admin/guest-photos/[id]/route");
      const response = await PATCH(
        makeReq("PATCH", { is_visible: false }),
        PARAMS,
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("hide photo", () => {
    it("returns 200 with photo set to hidden", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecuteTakeFirst.mockResolvedValueOnce({
        id: "photo-123",
        url: "https://utfs.io/f/a.jpg",
        uploader_name: "Alice",
        is_visible: false,
        hidden_at: new Date("2026-03-15T00:00:00Z"),
        hidden_by: "admin@example.com",
        uploaded_at: new Date(),
      });

      const { PATCH } = await import("@/app/api/admin/guest-photos/[id]/route");
      const response = await PATCH(
        makeReq("PATCH", { is_visible: false }),
        PARAMS,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photo.is_visible).toBe(false);
      expect(data.photo.hidden_by).toBe("admin@example.com");
    });
  });

  describe("show photo", () => {
    it("returns 200 with photo set to visible and hidden fields cleared", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecuteTakeFirst.mockResolvedValueOnce({
        id: "photo-123",
        url: "https://utfs.io/f/a.jpg",
        uploader_name: "Alice",
        is_visible: true,
        hidden_at: null,
        hidden_by: null,
        uploaded_at: new Date(),
      });

      const { PATCH } = await import("@/app/api/admin/guest-photos/[id]/route");
      const response = await PATCH(
        makeReq("PATCH", { is_visible: true }),
        PARAMS,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photo.is_visible).toBe(true);
      expect(data.photo.hidden_at).toBeNull();
      expect(data.photo.hidden_by).toBeNull();
    });
  });

  describe("photo not found", () => {
    it("returns 404 when photo does not exist", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecuteTakeFirst.mockResolvedValueOnce(undefined);

      const { PATCH } = await import("@/app/api/admin/guest-photos/[id]/route");
      const response = await PATCH(
        makeReq("PATCH", { is_visible: false }),
        PARAMS,
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Photo not found");
    });
  });
});

// ----- DELETE tests -----
describe("DELETE /api/admin/guest-photos/[id]", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
    mockExecuteTakeFirst.mockClear();
  });

  describe("auth guard", () => {
    it("returns 401 when unauthenticated", async () => {
      mockCurrentUser.mockResolvedValueOnce(null);

      const { DELETE } = await import(
        "@/app/api/admin/guest-photos/[id]/route"
      );
      const response = await DELETE(makeReq("DELETE"), PARAMS);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when user is not admin", async () => {
      mockCurrentUser.mockResolvedValueOnce(GUEST);

      const { DELETE } = await import(
        "@/app/api/admin/guest-photos/[id]/route"
      );
      const response = await DELETE(makeReq("DELETE"), PARAMS);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("successful delete", () => {
    it("returns 200 with the deleted photo", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecuteTakeFirst.mockResolvedValueOnce({
        id: "photo-123",
        url: "https://utfs.io/f/a.jpg",
        uploader_name: "Alice",
        is_visible: true,
        hidden_at: null,
        hidden_by: null,
        uploaded_at: new Date(),
      });

      const { DELETE } = await import(
        "@/app/api/admin/guest-photos/[id]/route"
      );
      const response = await DELETE(makeReq("DELETE"), PARAMS);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.photo.id).toBe("photo-123");
    });
  });

  describe("photo not found", () => {
    it("returns 404 when photo does not exist", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecuteTakeFirst.mockResolvedValueOnce(undefined);

      const { DELETE } = await import(
        "@/app/api/admin/guest-photos/[id]/route"
      );
      const response = await DELETE(makeReq("DELETE"), PARAMS);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Photo not found");
    });
  });

  describe("database error", () => {
    it("returns 500 on unexpected database error", async () => {
      mockCurrentUser.mockResolvedValueOnce(ADMIN);
      mockExecuteTakeFirst.mockRejectedValueOnce(new Error("DB failure"));

      const { DELETE } = await import(
        "@/app/api/admin/guest-photos/[id]/route"
      );
      const response = await DELETE(makeReq("DELETE"), PARAMS);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
