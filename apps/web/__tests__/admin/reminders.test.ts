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
const mockReminderScheduleFindMany = mock(() => Promise.resolve([]));
const mockReminderScheduleCreate = mock(() => Promise.resolve({}));
const mockReminderScheduleUpdate = mock(() => Promise.resolve({}));
const mockReminderScheduleDelete = mock(() => Promise.resolve({}));

mock.module("@/lib/db", () => ({
  db: {
    reminderSchedule: {
      findMany: mockReminderScheduleFindMany,
      create: mockReminderScheduleCreate,
      update: mockReminderScheduleUpdate,
      delete: mockReminderScheduleDelete,
    },
    weddingAdmin: {
      findFirst: mock(() => Promise.resolve(null)),
    },
  },
}));

describe("Admin Reminders API", () => {
  beforeEach(() => {
    mockReminderScheduleFindMany.mockClear();
    mockReminderScheduleCreate.mockClear();
    mockReminderScheduleUpdate.mockClear();
    mockReminderScheduleDelete.mockClear();
  });

  describe("GET /api/admin/reminders", () => {
    it("should return all reminder schedules", async () => {
      const schedules = [
        {
          id: "s1",
          weddingId: "test-wedding-id",
          daysBeforeDeadline: 10,
          isEnabled: true,
          lastRunAt: null,
        },
        {
          id: "s2",
          weddingId: "test-wedding-id",
          daysBeforeDeadline: 3,
          isEnabled: true,
          lastRunAt: null,
        },
      ];
      mockReminderScheduleFindMany.mockResolvedValue(schedules);

      const { GET } = await import("@/app/api/admin/reminders/route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.schedules).toHaveLength(2);
    });
  });

  describe("POST /api/admin/reminders", () => {
    it("should create a reminder schedule", async () => {
      const created = {
        id: "s1",
        weddingId: "test-wedding-id",
        daysBeforeDeadline: 10,
        isEnabled: true,
      };
      mockReminderScheduleCreate.mockResolvedValue(created);

      const { POST } = await import("@/app/api/admin/reminders/route");
      const request = new Request("http://localhost:3000/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBeforeDeadline: 10 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.schedule.daysBeforeDeadline).toBe(10);
    });

    it("should reject invalid daysBeforeDeadline", async () => {
      const { POST } = await import("@/app/api/admin/reminders/route");

      const request = new Request("http://localhost:3000/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBeforeDeadline: -5 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should reject non-integer daysBeforeDeadline", async () => {
      const { POST } = await import("@/app/api/admin/reminders/route");

      const request = new Request("http://localhost:3000/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBeforeDeadline: 3.5 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should reject missing daysBeforeDeadline", async () => {
      const { POST } = await import("@/app/api/admin/reminders/route");

      const request = new Request("http://localhost:3000/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/admin/reminders", () => {
    it("should update reminder schedules", async () => {
      const updated = {
        id: "s1",
        weddingId: "test-wedding-id",
        daysBeforeDeadline: 10,
        isEnabled: false,
      };
      mockReminderScheduleUpdate.mockResolvedValue(updated);

      const { PUT } = await import("@/app/api/admin/reminders/route");
      const request = new Request("http://localhost:3000/api/admin/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedules: [{ id: "s1", isEnabled: false }],
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.schedules).toHaveLength(1);
      expect(mockReminderScheduleUpdate).toHaveBeenCalledTimes(1);
    });

    it("should reject non-array schedules", async () => {
      const { PUT } = await import("@/app/api/admin/reminders/route");
      const request = new Request("http://localhost:3000/api/admin/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: "not-array" }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/admin/reminders", () => {
    it("should delete a reminder schedule", async () => {
      mockReminderScheduleDelete.mockResolvedValue({});

      const { DELETE } = await import("@/app/api/admin/reminders/route");
      const request = new Request("http://localhost:3000/api/admin/reminders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "s1" }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should reject missing id", async () => {
      const { DELETE } = await import("@/app/api/admin/reminders/route");
      const request = new Request("http://localhost:3000/api/admin/reminders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });
  });
});
