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

// Mock the db module with Prisma-style mocks
mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({ id: "test-id" })),
      update: mock(() => Promise.resolve({ id: "test-id" })),
      delete: mock(() => Promise.resolve({})),
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
      count: mock(() => Promise.resolve(0)),
    },
    party: {
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({ id: "test-id" })),
      delete: mock(() => Promise.resolve({})),
    },
    event: {
      findFirst: mock(() => Promise.resolve(null)),
    },
    weddingAdmin: {
      findFirst: mock(() => Promise.resolve(null)),
    },
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
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "notadmin@example.com",
            verification: { status: "verified" },
          },
        ],
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
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "admin@example.com",
            verification: { status: "verified" },
          },
        ],
      });

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();

      expect(response.status).toBe(200);
    });

    it("should be case-insensitive for admin email check", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "admin-123",
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "ADMIN@EXAMPLE.COM",
            verification: { status: "verified" },
          },
        ],
      });

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();

      expect(response.status).toBe(200);
    });

    it("should DENY an admin email that is not verified", async () => {
      // An attacker can add a victim's email to their Clerk account, but it
      // stays unverified — it must not authorize.
      mockCurrentUser.mockResolvedValue({
        id: "attacker-1",
        primaryEmailAddressId: "email-primary",
        emailAddresses: [
          {
            id: "email-primary",
            emailAddress: "admin@example.com",
            verification: { status: "unverified" },
          },
        ],
      });

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();

      expect(response.status).toBe(401);
    });

    // The secondary verified "admin@example.com" must NOT grant access; only the
    // primary (attacker@example.com, a non-admin) is used → Forbidden.
    it("should DENY an admin email that is not the primary address", async () => {
      // A verified-but-non-primary address must not be used for authorization.
      mockCurrentUser.mockResolvedValue({
        id: "attacker-2",
        primaryEmailAddressId: "email-other",
        emailAddresses: [
          {
            id: "email-secondary",
            emailAddress: "admin@example.com",
            verification: { status: "verified" },
          },
          {
            id: "email-other",
            emailAddress: "attacker@example.com",
            verification: { status: "verified" },
          },
        ],
      });

      const { GET } = await import("@/app/api/admin/guests/route");

      const response = await GET();

      expect(response.status).toBe(403);
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
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "admin@example.com",
          verification: { status: "verified" },
        },
      ],
    });

    const { GET: GET1 } = await import("@/app/api/admin/guests/route");
    const response1 = await GET1();
    expect(response1.status).toBe(200);

    // Second admin
    mockCurrentUser.mockResolvedValue({
      id: "admin-2",
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "admin2@example.com",
          verification: { status: "verified" },
        },
      ],
    });

    const { GET: GET2 } = await import("@/app/api/admin/guests/route");
    const response2 = await GET2();
    expect(response2.status).toBe(200);
  });
});
