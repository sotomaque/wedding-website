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

// Create db mock with tracking
const mockExecute = mock(() => Promise.resolve([]));
const mockExecuteTakeFirst = mock(() => Promise.resolve(null));
const mockExecuteTakeFirstOrThrow = mock(() => Promise.resolve({}));
const mockInsertValues = mock(() => {});
const mockDeleteWhere = mock(() => {});

mock.module("@/lib/db", () => ({
  db: {
    selectFrom: (table: string) => ({
      selectAll: () => ({
        orderBy: () => ({
          asc: () => ({
            execute: mockExecute,
          }),
          execute: mockExecute,
        }),
        where: () => ({
          execute: mockExecute,
          executeTakeFirst: mockExecuteTakeFirst,
          orderBy: () => ({
            execute: mockExecute,
          }),
        }),
        execute: mockExecute,
      }),
      select: () => ({
        where: () => ({
          executeTakeFirst: mockExecuteTakeFirst,
          execute: mockExecute,
          orderBy: () => ({
            execute: mockExecute,
          }),
        }),
      }),
    }),
    insertInto: () => ({
      values: (data: unknown) => {
        mockInsertValues(data);
        return {
          returningAll: () => ({
            executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
            executeTakeFirst: mockExecuteTakeFirst,
          }),
          execute: mockExecute,
        };
      },
    }),
    updateTable: () => ({
      set: () => ({
        where: () => ({
          execute: mockExecute,
          returningAll: () => ({
            executeTakeFirst: mockExecuteTakeFirst,
          }),
        }),
      }),
    }),
    deleteFrom: () => ({
      where: (field: string, op: string, value: unknown) => {
        mockDeleteWhere(field, op, value);
        return {
          execute: mockExecute,
          where: () => ({
            execute: mockExecute,
          }),
        };
      },
    }),
  },
}));

describe("Seating Charts API - Authentication", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
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
      mockExecute.mockResolvedValue([]);

      const { GET } = await import("@/app/api/admin/seating-charts/route");

      const response = await GET();

      expect(response.status).toBe(200);
    });
  });
});

describe("Seating Charts API - CRUD Operations", () => {
  beforeEach(() => {
    mockCurrentUser.mockClear();
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockExecuteTakeFirstOrThrow.mockClear();
    mockInsertValues.mockClear();
    mockDeleteWhere.mockClear();

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
          default_seats_per_table: 8,
          is_active: true,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      mockExecute.mockResolvedValue(mockCharts);

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
        default_seats_per_table: 10,
        is_active: false,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockExecuteTakeFirstOrThrow.mockResolvedValue(newChart);

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
      expect(mockInsertValues).toHaveBeenCalled();
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
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockInsertValues.mockClear();
    mockDeleteWhere.mockClear();

    // Default to authenticated admin
    mockCurrentUser.mockResolvedValue({
      id: "admin-123",
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    });
  });

  describe("POST /api/admin/seating-charts/[id]/assignments", () => {
    it("should require assignments array", async () => {
      mockExecute.mockResolvedValue([{ id: "table-1" }]); // tables exist

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
      mockExecute.mockResolvedValue([{ id: "table-1" }]); // tables exist

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
      mockExecute.mockResolvedValue([{ id: "table-1" }]); // tables exist

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
      mockExecute.mockResolvedValue([{ id: "table-1" }, { id: "table-2" }]);

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
      mockExecute.mockResolvedValue([{ id: "table-1" }, { id: "table-2" }]);

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
