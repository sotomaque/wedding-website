import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock env
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
    OPENAI_API_KEY: "test-openai-key",
    RESEND_API_KEY: "test-key",
    RSVP_EMAIL: "rsvp@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock Clerk
const mockCurrentUser = mock(() =>
  Promise.resolve({
    id: "admin-123",
    emailAddresses: [{ emailAddress: "admin@example.com" }],
  }),
);

mock.module("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
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

// Create Prisma-style db mocks
const mockSeatingChartFindMany = mock(() => Promise.resolve([]));
const mockSeatingChartCreate = mock(() => Promise.resolve({}));

const mockSeatingTableFindMany = mock(() => Promise.resolve([]));

const mockGuestTableAssignmentDeleteMany = mock(() =>
  Promise.resolve({ count: 0 }),
);
const mockGuestTableAssignmentCreateMany = mock(() =>
  Promise.resolve({ count: 0 }),
);

mock.module("@/lib/db", () => ({
  db: {
    seatingChart: {
      findMany: mockSeatingChartFindMany,
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      create: mockSeatingChartCreate,
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
    },
    seatingTable: {
      findMany: mockSeatingTableFindMany,
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
    },
    guestTableAssignment: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      createMany: mockGuestTableAssignmentCreateMany,
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
      deleteMany: mockGuestTableAssignmentDeleteMany,
    },
  },
}));

describe("Seating Charts API - Authentication", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
    mockSeatingChartFindMany.mockClear();
  });

  describe("Unauthorized access", () => {
    it("should return 401 when no user is authenticated", async () => {
      mockCurrentUser.mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/seating-charts/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not an admin", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "user-123",
        emailAddresses: [{ emailAddress: "notadmin@example.com" }],
      });

      const { GET } = await import("@/app/api/admin/seating-charts/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Authorized access", () => {
    it("should allow access when user is an admin", async () => {
      mockCurrentUser.mockResolvedValue({
        id: "admin-123",
        emailAddresses: [{ emailAddress: "admin@example.com" }],
      });
      mockSeatingChartFindMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/admin/seating-charts/route");

      const response = await GET();

      expect(response.status).toBe(200);
    });
  });
});

describe("Seating Charts API - CRUD Operations", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
    mockSeatingChartFindMany.mockClear();
    mockSeatingChartCreate.mockClear();

    // Default to authenticated admin
    mockCurrentUser.mockResolvedValue({
      id: "admin-123",
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    });
  });

  describe("GET /api/admin/seating-charts", () => {
    it("should return list of charts", async () => {
      const mockCharts = [
        {
          id: "chart-1",
          name: "Wedding Reception",
          defaultSeatsPerTable: 8,
          isActive: true,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      mockSeatingChartFindMany.mockResolvedValue(mockCharts);

      const { GET } = await import("@/app/api/admin/seating-charts/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.charts).toEqual(mockCharts);
    });
  });

  describe("POST /api/admin/seating-charts", () => {
    it("should create a new chart", async () => {
      const newChart = {
        id: "chart-new",
        name: "New Chart",
        defaultSeatsPerTable: 10,
        isActive: false,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockSeatingChartCreate.mockResolvedValue(newChart);

      const { POST } = await import("@/app/api/admin/seating-charts/route");

      const request = new Request(
        "http://localhost:3000/api/admin/seating-charts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Chart",
            defaultSeatsPerTable: 10,
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.chart).toBeDefined();
      expect(mockSeatingChartCreate).toHaveBeenCalled();
    });

    it("should require chart name", async () => {
      const { POST } = await import("@/app/api/admin/seating-charts/route");

      const request = new Request(
        "http://localhost:3000/api/admin/seating-charts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Chart name is required");
    });
  });
});

describe("Seating Charts Assignments API", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
    mockSeatingTableFindMany.mockClear();
    mockGuestTableAssignmentDeleteMany.mockClear();
    mockGuestTableAssignmentCreateMany.mockClear();

    // Default to authenticated admin
    mockCurrentUser.mockResolvedValue({
      id: "admin-123",
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    });
  });

  describe("POST /api/admin/seating-charts/[id]/assignments", () => {
    it("should require assignments array", async () => {
      mockSeatingTableFindMany.mockResolvedValue([{ id: "table-1" }]);

      const { POST } = await import(
        "@/app/api/admin/seating-charts/[id]/assignments/route"
      );

      const request = new Request(
        "http://localhost:3000/api/admin/seating-charts/chart-1/assignments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "chart-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Assignments array is required");
    });

    it("should filter out invalid UUIDs", async () => {
      mockSeatingTableFindMany.mockResolvedValue([{ id: "table-1" }]);

      const { POST } = await import(
        "@/app/api/admin/seating-charts/[id]/assignments/route"
      );

      const request = new Request(
        "http://localhost:3000/api/admin/seating-charts/chart-1/assignments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignments: [
              { guestId: "not-a-uuid", tableId: "table-1" },
              { guestId: "ABCD-1234", tableId: "table-1" }, // invite code, not UUID
            ],
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "chart-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No valid assignments");
    });

    it("should accept valid UUID guest IDs", async () => {
      const validUUID = "30355773-01ab-48f3-877a-6376c6be0026";
      mockSeatingTableFindMany.mockResolvedValue([{ id: "table-1" }]);

      const { POST } = await import(
        "@/app/api/admin/seating-charts/[id]/assignments/route"
      );

      const request = new Request(
        "http://localhost:3000/api/admin/seating-charts/chart-1/assignments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignments: [{ guestId: validUUID, tableId: "table-1" }],
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "chart-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignedCount).toBe(1);
    });

    it("should deduplicate guest assignments", async () => {
      const validUUID = "30355773-01ab-48f3-877a-6376c6be0026";
      mockSeatingTableFindMany.mockResolvedValue([
        { id: "table-1" },
        { id: "table-2" },
      ]);

      const { POST } = await import(
        "@/app/api/admin/seating-charts/[id]/assignments/route"
      );

      const request = new Request(
        "http://localhost:3000/api/admin/seating-charts/chart-1/assignments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignments: [
              { guestId: validUUID, tableId: "table-1" },
              { guestId: validUUID, tableId: "table-2" }, // duplicate guest
            ],
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: "chart-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.assignedCount).toBe(1); // Only first assignment kept
    });
  });

  describe("DELETE /api/admin/seating-charts/[id]/assignments", () => {
    it("should clear all assignments for a chart", async () => {
      mockSeatingTableFindMany.mockResolvedValue([
        { id: "table-1" },
        { id: "table-2" },
      ]);

      const { DELETE } = await import(
        "@/app/api/admin/seating-charts/[id]/assignments/route"
      );

      const request = new Request(
        "http://localhost:3000/api/admin/seating-charts/chart-1/assignments",
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "chart-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
