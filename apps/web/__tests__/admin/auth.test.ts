import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock currentUser from Clerk
const mockCurrentUser = mock(() => Promise.resolve(null));

mock.module("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
}));

// Mock the env module
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com,admin2@example.com",
    RESEND_API_KEY: "test-key",
    RSVP_EMAIL: "rsvp@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock the db module
mock.module("@/lib/db", () => ({
  db: {
    selectFrom: () => ({
      selectAll: () => ({
        orderBy: () => ({
          execute: () => Promise.resolve([]),
        }),
        where: () => ({
          execute: () => Promise.resolve([]),
          executeTakeFirst: () => Promise.resolve(null),
        }),
      }),
      select: () => ({
        where: () => ({
          executeTakeFirst: () => Promise.resolve(null),
        }),
      }),
    }),
    insertInto: () => ({
      values: () => ({
        returningAll: () => ({
          executeTakeFirstOrThrow: () => Promise.resolve({ id: "test-id" }),
          executeTakeFirst: () => Promise.resolve({ id: "test-id" }),
        }),
      }),
    }),
    updateTable: () => ({
      set: () => ({
        where: () => ({
          execute: () => Promise.resolve([]),
          returningAll: () => ({
            executeTakeFirst: () => Promise.resolve({ id: "test-id" }),
          }),
        }),
      }),
    }),
    deleteFrom: () => ({
      where: () => ({
        execute: () => Promise.resolve([]),
      }),
    }),
  },
}));

describe("Admin API Authentication", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
  });

  describe("Unauthorized access (no user)", () => {
    it("should return 401 when no user is authenticated", async () => {
      mockCurrentUser.mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Forbidden access (non-admin user)", () => {
    it("should return 403 when user is not an admin", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "user-123",
        emailAddresses: [{ emailAddress: "notadmin@example.com" }],
      });

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Authorized access (admin user)", () => {
    it("should allow access when user is an admin", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "admin-123",
        emailAddresses: [{ emailAddress: "admin@example.com" }],
      });

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();

      expect(response.status).toBe(200);
    });

    it("should be case-insensitive for admin email check", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "admin-123",
        emailAddresses: [{ emailAddress: "ADMIN@EXAMPLE.COM" }],
      });

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();

      expect(response.status).toBe(200);
    });
  });
});

describe("Admin Email Whitelist", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
  });

  it("should support multiple admin emails", async () => {
    // First admin
    mockCurrentUser.mockResolvedValue({
      id: "admin-1",
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    });

    const { GET: GET1 } = await import("@/app/api/admin/guests/route");
    const response1 = await GET1();
    expect(response1.status).toBe(200);

    // Second admin
    mockCurrentUser.mockResolvedValue({
      id: "admin-2",
      emailAddresses: [{ emailAddress: "admin2@example.com" }],
    });

    const { GET: GET2 } = await import("@/app/api/admin/guests/route");
    const response2 = await GET2();
    expect(response2.status).toBe(200);
  });
});
