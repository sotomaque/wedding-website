import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock env
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
  },
}));

// Mock Clerk
mock.module("@clerk/nextjs/server", () => ({
  currentUser: () =>
    Promise.resolve({
      id: "admin-123",
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    }),
}));

// Mock wedding context
mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
  getWeddingContext: mock(() =>
    Promise.resolve({ weddingId: "test-wedding-id", slug: "test-wedding" }),
  ),
}));

// DB mocks
const mockAdminSummaryConfigFindUnique = mock(() => Promise.resolve(null));
const mockAdminSummaryConfigUpsert = mock(() => Promise.resolve({}));

mock.module("@/lib/db", () => ({
  db: {
    adminSummaryConfig: {
      findUnique: mockAdminSummaryConfigFindUnique,
      upsert: mockAdminSummaryConfigUpsert,
    },
    weddingAdmin: {
      findFirst: mock(() => Promise.resolve(null)),
    },
  },
}));

describe("Admin Summary Config API", () => {
  beforeEach(() => {
    mockAdminSummaryConfigFindUnique.mockClear();
    mockAdminSummaryConfigUpsert.mockClear();
  });

  describe("GET /api/admin/admin-summary-config", () => {
    it("should return existing config", async () => {
      const config = {
        id: "config-1",
        weddingId: "test-wedding-id",
        isEnabled: true,
        frequencyDays: 7,
        lastRunAt: null,
      };
      mockAdminSummaryConfigFindUnique.mockResolvedValue(config);

      const { GET } = await import(
        "@/app/api/admin/admin-summary-config/route"
      );
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config.isEnabled).toBe(true);
      expect(data.config.frequencyDays).toBe(7);
    });

    it("should return default config when none exists", async () => {
      mockAdminSummaryConfigFindUnique.mockResolvedValue(null);

      const { GET } = await import(
        "@/app/api/admin/admin-summary-config/route"
      );
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config.isEnabled).toBe(false);
      expect(data.config.frequencyDays).toBe(7);
    });
  });

  describe("PUT /api/admin/admin-summary-config", () => {
    it("should create or update config", async () => {
      const config = {
        id: "config-1",
        weddingId: "test-wedding-id",
        isEnabled: true,
        frequencyDays: 14,
      };
      mockAdminSummaryConfigUpsert.mockResolvedValue(config);

      const { PUT } = await import(
        "@/app/api/admin/admin-summary-config/route"
      );
      const request = new Request(
        "http://localhost:3000/api/admin/admin-summary-config",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: true, frequencyDays: 14 }),
        },
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config.isEnabled).toBe(true);
      expect(data.config.frequencyDays).toBe(14);
    });

    it("should reject missing isEnabled", async () => {
      const { PUT } = await import(
        "@/app/api/admin/admin-summary-config/route"
      );
      const request = new Request(
        "http://localhost:3000/api/admin/admin-summary-config",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frequencyDays: 7 }),
        },
      );

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });

    it("should reject invalid frequencyDays", async () => {
      const { PUT } = await import(
        "@/app/api/admin/admin-summary-config/route"
      );
      const request = new Request(
        "http://localhost:3000/api/admin/admin-summary-config",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: true, frequencyDays: 0 }),
        },
      );

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });

    it("should reject non-integer frequencyDays", async () => {
      const { PUT } = await import(
        "@/app/api/admin/admin-summary-config/route"
      );
      const request = new Request(
        "http://localhost:3000/api/admin/admin-summary-config",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: true, frequencyDays: 3.5 }),
        },
      );

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });

    it("should use default frequencyDays when not provided", async () => {
      const config = {
        id: "config-1",
        weddingId: "test-wedding-id",
        isEnabled: false,
        frequencyDays: 7,
      };
      mockAdminSummaryConfigUpsert.mockResolvedValue(config);

      const { PUT } = await import(
        "@/app/api/admin/admin-summary-config/route"
      );
      const request = new Request(
        "http://localhost:3000/api/admin/admin-summary-config",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: false }),
        },
      );

      const response = await PUT(request);
      expect(response.status).toBe(200);
      expect(mockAdminSummaryConfigUpsert).toHaveBeenCalledTimes(1);
    });
  });
});
