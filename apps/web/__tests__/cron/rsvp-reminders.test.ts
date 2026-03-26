import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// Mock email sending
const mockSendEmail = mock(() =>
  Promise.resolve({ data: { id: "email-123" }, error: null }),
);

mock.module("@/lib/email/resend-client", () => ({
  sendEmail: mockSendEmail,
  getResendClient: mock(() => ({})),
}));

// Mock env
mock.module("@/env", () => ({
  env: {
    RESEND_API_KEY: "test-resend-key",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock email helpers - use real logic for getEmailFromAddress
mock.module("@/lib/email/helpers", () => ({
  getEmailFromAddress: mock(() => "RSVP Reminder <rsvp@test-wedding.com>"),
  getNotificationRecipients: mock(() => ["admin@example.com"]),
}));

// Mock URL helper
mock.module("@/lib/url", () => ({
  weddingUrl: mock(
    (slug: string, path: string) => `http://localhost:3000/${slug}${path}`,
  ),
}));

// DB mocks
const mockReminderScheduleFindMany = mock(() => Promise.resolve([]));
const mockReminderScheduleUpdate = mock(() => Promise.resolve({}));
const mockGuestFindMany = mock(() => Promise.resolve([]));
const mockGuestUpdate = mock(() => Promise.resolve({}));
const mockEmailTemplateFindUnique = mock(() =>
  Promise.resolve({
    id: "tpl-reminder",
    weddingId: "wedding-1",
    type: "rsvp_reminder",
    name: "RSVP Reminder",
    subject: "Reminder: Please RSVP",
    htmlBody: "<p>Reminder email</p>",
    isActive: true,
    variables: [],
  }),
);

mock.module("@/lib/db", () => ({
  db: {
    reminderSchedule: {
      findMany: mockReminderScheduleFindMany,
      update: mockReminderScheduleUpdate,
    },
    guest: {
      findMany: mockGuestFindMany,
      update: mockGuestUpdate,
    },
    emailTemplate: {
      findUnique: mockEmailTemplateFindUnique,
    },
  },
}));

// Helper to create a Request with auth header
function cronRequest(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }
  return new Request("http://localhost:3000/api/cron/rsvp-reminders", {
    method: "GET",
    headers,
  });
}

describe("RSVP Reminders Cron", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    mockSendEmail.mockClear();
    mockEmailTemplateFindUnique.mockClear();
    mockReminderScheduleFindMany.mockClear();
    mockReminderScheduleUpdate.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestUpdate.mockClear();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it("should return 401 without authorization header", async () => {
    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest() as never);
    expect(response.status).toBe(401);
  });

  it("should return 401 with wrong secret", async () => {
    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("wrong-secret") as never);
    expect(response.status).toBe(401);
  });

  it("should return 401 when CRON_SECRET is not set", async () => {
    process.env.CRON_SECRET = "";
    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("any-secret") as never);
    expect(response.status).toBe(401);
  });

  it("should return success with no schedules", async () => {
    mockReminderScheduleFindMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.totalSent).toBe(0);
  });

  it("should skip schedule when target date does not match today", async () => {
    // Schedule is 10 days before a deadline far in the future
    mockReminderScheduleFindMany.mockResolvedValue([
      {
        id: "schedule-1",
        weddingId: "wedding-1",
        daysBeforeDeadline: 10,
        isEnabled: true,
        lastRunAt: null,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          rsvpDeadline: "2027-11-01",
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
        },
      },
    ]);

    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalSent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should send reminders when target date matches today", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Set deadline to 5 days from now, schedule at 5 days before
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 5);

    mockReminderScheduleFindMany.mockResolvedValue([
      {
        id: "schedule-1",
        weddingId: "wedding-1",
        daysBeforeDeadline: 5,
        isEnabled: true,
        lastRunAt: null,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          rsvpDeadline: deadline.toISOString().split("T")[0],
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
        },
      },
    ]);

    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        inviteCode: "ABCD",
        numberOfResends: 1,
        rsvpStatus: "pending",
        isPlusOne: false,
        reminderCount: 0,
      },
      {
        id: "guest-2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        inviteCode: "EFGH",
        numberOfResends: 2,
        rsvpStatus: "pending",
        isPlusOne: false,
        reminderCount: 1,
      },
    ]);

    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.totalSent).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockGuestUpdate).toHaveBeenCalledTimes(2);
    expect(mockReminderScheduleUpdate).toHaveBeenCalledTimes(1);
  });

  it("should skip schedule that already ran today", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 5);

    mockReminderScheduleFindMany.mockResolvedValue([
      {
        id: "schedule-1",
        weddingId: "wedding-1",
        daysBeforeDeadline: 5,
        isEnabled: true,
        lastRunAt: new Date(), // Already ran today
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          rsvpDeadline: deadline.toISOString().split("T")[0],
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
        },
      },
    ]);

    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(data.totalSent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should skip when deadline has passed", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Deadline was yesterday
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() - 1);

    mockReminderScheduleFindMany.mockResolvedValue([
      {
        id: "schedule-1",
        weddingId: "wedding-1",
        daysBeforeDeadline: 0,
        isEnabled: true,
        lastRunAt: null,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2025-01-01"),
          rsvpDeadline: deadline.toISOString().split("T")[0],
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
        },
      },
    ]);

    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(data.totalSent).toBe(0);
  });

  it("should not send to guests who have no pending guests", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 3);

    mockReminderScheduleFindMany.mockResolvedValue([
      {
        id: "schedule-1",
        weddingId: "wedding-1",
        daysBeforeDeadline: 3,
        isEnabled: true,
        lastRunAt: null,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          rsvpDeadline: deadline.toISOString().split("T")[0],
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
        },
      },
    ]);

    // No matching guests
    mockGuestFindMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(data.totalSent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should handle email sending errors gracefully", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 5);

    mockReminderScheduleFindMany.mockResolvedValue([
      {
        id: "schedule-1",
        weddingId: "wedding-1",
        daysBeforeDeadline: 5,
        isEnabled: true,
        lastRunAt: null,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          rsvpDeadline: deadline.toISOString().split("T")[0],
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
        },
      },
    ]);

    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        inviteCode: "ABCD",
        numberOfResends: 1,
        rsvpStatus: "pending",
        isPlusOne: false,
        reminderCount: 0,
      },
    ]);

    // Email fails
    mockSendEmail.mockResolvedValueOnce({
      data: null,
      error: new Error("Send failed"),
    });

    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].errors).toBe(1);
    expect(data.results[0].sent).toBe(0);
  });

  it("should skip when template is inactive", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 5);

    mockReminderScheduleFindMany.mockResolvedValue([
      {
        id: "schedule-1",
        weddingId: "wedding-1",
        daysBeforeDeadline: 5,
        isEnabled: true,
        lastRunAt: null,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          rsvpDeadline: deadline.toISOString().split("T")[0],
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
        },
      },
    ]);

    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        inviteCode: "ABCD",
        numberOfResends: 1,
        rsvpStatus: "pending",
        isPlusOne: false,
        reminderCount: 0,
      },
    ]);

    // Template is inactive
    mockEmailTemplateFindUnique.mockResolvedValueOnce({
      id: "tpl-reminder",
      weddingId: "wedding-1",
      type: "rsvp_reminder",
      name: "RSVP Reminder",
      subject: "Reminder",
      htmlBody: "<p>Test</p>",
      isActive: false,
      variables: [],
    });

    const { GET } = await import("@/app/api/cron/rsvp-reminders/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(data.totalSent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
