import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the env module
vi.mock("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com,admin2@example.com",
    RESEND_API_KEY: "test-key",
    RSVP_EMAIL: "rsvp@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    selectFrom: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          execute: vi.fn().mockResolvedValue([]),
        })),
        where: vi.fn(() => ({
          execute: vi.fn().mockResolvedValue([]),
          executeTakeFirst: vi.fn().mockResolvedValue(null),
        })),
      })),
      select: vi.fn(() => ({
        where: vi.fn(() => ({
          executeTakeFirst: vi.fn().mockResolvedValue(null),
        })),
      })),
    })),
    insertInto: vi.fn(() => ({
      values: vi.fn(() => ({
        returningAll: vi.fn(() => ({
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ id: "test-id" }),
          executeTakeFirst: vi.fn().mockResolvedValue({ id: "test-id" }),
        })),
      })),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: vi.fn().mockResolvedValue([]),
          returningAll: vi.fn(() => ({
            executeTakeFirst: vi.fn().mockResolvedValue({ id: "test-id" }),
          })),
        })),
      })),
    })),
    deleteFrom: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: vi.fn().mockResolvedValue([]),
      })),
    })),
  },
}));

import { currentUser } from "@clerk/nextjs/server";

describe("Admin API Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unauthorized access (no user)", () => {
    it("should return 401 when no user is authenticated", async () => {
      vi.mocked(currentUser).mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Forbidden access (non-admin user)", () => {
    it("should return 403 when user is not an admin", async () => {
      vi.mocked(currentUser).mockResolvedValue({
        id: "user-123",
        emailAddresses: [{ emailAddress: "notadmin@example.com" }],
      } as ReturnType<typeof currentUser> extends Promise<infer T> ? T : never);

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Authorized access (admin user)", () => {
    it("should allow access when user is an admin", async () => {
      vi.mocked(currentUser).mockResolvedValue({
        id: "admin-123",
        emailAddresses: [{ emailAddress: "admin@example.com" }],
      } as ReturnType<typeof currentUser> extends Promise<infer T> ? T : never);

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();

      expect(response.status).toBe(200);
    });

    it("should be case-insensitive for admin email check", async () => {
      vi.mocked(currentUser).mockResolvedValue({
        id: "admin-123",
        emailAddresses: [{ emailAddress: "ADMIN@EXAMPLE.COM" }],
      } as ReturnType<typeof currentUser> extends Promise<infer T> ? T : never);

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();

      expect(response.status).toBe(200);
    });
  });
});

describe("Admin Email Whitelist", () => {
  it("should support multiple admin emails", async () => {
    // First admin
    vi.mocked(currentUser).mockResolvedValue({
      id: "admin-1",
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    } as ReturnType<typeof currentUser> extends Promise<infer T> ? T : never);

    const { GET: GET1 } = await import("@/app/api/admin/guests/route");
    const response1 = await GET1();
    expect(response1.status).toBe(200);

    // Second admin
    vi.mocked(currentUser).mockResolvedValue({
      id: "admin-2",
      emailAddresses: [{ emailAddress: "admin2@example.com" }],
    } as ReturnType<typeof currentUser> extends Promise<infer T> ? T : never);

    const { GET: GET2 } = await import("@/app/api/admin/guests/route");
    const response2 = await GET2();
    expect(response2.status).toBe(200);
  });
});
