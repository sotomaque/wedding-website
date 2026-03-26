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

// Mock email helpers
const mockGetNotificationRecipients = mock(() => ["admin@example.com"]);

mock.module("@/lib/email/helpers", () => ({
  getEmailFromAddress: mock(() => "Wedding Summary <rsvp@test.com>"),
  getNotificationRecipients: mockGetNotificationRecipients,
}));

// Mock URL helper
mock.module("@/lib/url", () => ({
  weddingUrl: mock(
    (slug: string, path: string) => `http://localhost:3000/${slug}${path}`,
  ),
}));

// Mock email template rendering
const mockRenderEmailTemplate = mock(() =>
  Promise.resolve({
    subject: "Wedding Update: Guest List Summary",
    html: "<p>Summary</p>",
  }),
);

mock.module("@/lib/email/render-template", () => ({
  renderEmailTemplate: mockRenderEmailTemplate,
}));

// DB mocks
const mockAdminSummaryConfigFindMany = mock(() => Promise.resolve([]));
const mockAdminSummaryConfigUpdate = mock(() => Promise.resolve({}));
const mockGuestFindMany = mock(() => Promise.resolve([]));

mock.module("@/lib/db", () => ({
  db: {
    adminSummaryConfig: {
      findMany: mockAdminSummaryConfigFindMany,
      update: mockAdminSummaryConfigUpdate,
    },
    guest: {
      findMany: mockGuestFindMany,
    },
  },
}));

function cronRequest(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }
  return new Request("http://localhost:3000/api/cron/admin-summary", {
    method: "GET",
    headers,
  });
}

describe("Admin Summary Cron", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    mockSendEmail.mockClear();
    mockRenderEmailTemplate.mockClear();
    mockAdminSummaryConfigFindMany.mockClear();
    mockAdminSummaryConfigUpdate.mockClear();
    mockGuestFindMany.mockClear();
    mockGetNotificationRecipients.mockClear();
    mockGetNotificationRecipients.mockReturnValue(["admin@example.com"]);
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it("should return 401 without authorization header", async () => {
    const { GET } = await import("@/app/api/cron/admin-summary/route");
    const response = await GET(cronRequest() as never);
    expect(response.status).toBe(401);
  });

  it("should return 401 with wrong secret", async () => {
    const { GET } = await import("@/app/api/cron/admin-summary/route");
    const response = await GET(cronRequest("wrong-secret") as never);
    expect(response.status).toBe(401);
  });

  it("should return success with no configs", async () => {
    mockAdminSummaryConfigFindMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/cron/admin-summary/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.totalSent).toBe(0);
  });

  it("should skip config that ran too recently", async () => {
    // Last ran 3 days ago, frequency is 7 days
    const lastRun = new Date();
    lastRun.setDate(lastRun.getDate() - 3);

    mockAdminSummaryConfigFindMany.mockResolvedValue([
      {
        id: "config-1",
        weddingId: "wedding-1",
        isEnabled: true,
        frequencyDays: 7,
        lastRunAt: lastRun,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
          notificationEmails: "admin@example.com",
        },
      },
    ]);

    const { GET } = await import("@/app/api/cron/admin-summary/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(data.totalSent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should send summary when enough time has passed", async () => {
    // Last ran 8 days ago, frequency is 7 days
    const lastRun = new Date();
    lastRun.setDate(lastRun.getDate() - 8);

    mockAdminSummaryConfigFindMany.mockResolvedValue([
      {
        id: "config-1",
        weddingId: "wedding-1",
        isEnabled: true,
        frequencyDays: 7,
        lastRunAt: lastRun,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
          notificationEmails: "admin@example.com",
        },
      },
    ]);

    mockGuestFindMany.mockResolvedValue([
      {
        id: "g1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        rsvpStatus: "yes",
        numberOfResends: 1,
      },
      {
        id: "g2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        rsvpStatus: "pending",
        numberOfResends: 1,
      },
      {
        id: "g3",
        firstName: "Bob",
        lastName: "Wilson",
        email: null,
        rsvpStatus: "pending",
        numberOfResends: 0,
      },
    ]);

    const { GET } = await import("@/app/api/cron/admin-summary/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.totalSent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockAdminSummaryConfigUpdate).toHaveBeenCalledTimes(1);

    // Check template was called with correct stats
    expect(mockRenderEmailTemplate).toHaveBeenCalledWith(
      "wedding-1",
      "admin_summary",
      expect.objectContaining({
        TOTAL_A_LIST: "3",
        A_LIST_INVITED: "2",
        A_LIST_NOT_INVITED: "1",
        A_LIST_YES: "1",
        A_LIST_PENDING: "1",
        A_LIST_NO: "0",
      }),
    );
  });

  it("should send on first run when lastRunAt is null", async () => {
    mockAdminSummaryConfigFindMany.mockResolvedValue([
      {
        id: "config-1",
        weddingId: "wedding-1",
        isEnabled: true,
        frequencyDays: 7,
        lastRunAt: null, // Never ran before
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
          notificationEmails: "admin@example.com",
        },
      },
    ]);

    mockGuestFindMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/cron/admin-summary/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(data.totalSent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("should skip when no notification recipients are configured", async () => {
    mockGetNotificationRecipients.mockReturnValue([]);

    mockAdminSummaryConfigFindMany.mockResolvedValue([
      {
        id: "config-1",
        weddingId: "wedding-1",
        isEnabled: true,
        frequencyDays: 7,
        lastRunAt: null,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
          notificationEmails: null,
        },
      },
    ]);

    const { GET } = await import("@/app/api/cron/admin-summary/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(data.totalSent).toBe(0);
    expect(data.results[0].error).toBe("No notification recipients configured");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should handle email sending errors gracefully", async () => {
    mockAdminSummaryConfigFindMany.mockResolvedValue([
      {
        id: "config-1",
        weddingId: "wedding-1",
        isEnabled: true,
        frequencyDays: 7,
        lastRunAt: null,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
          notificationEmails: "admin@example.com",
        },
      },
    ]);

    mockGuestFindMany.mockResolvedValue([]);

    mockSendEmail.mockResolvedValueOnce({
      data: null,
      error: new Error("Send failed"),
    });

    const { GET } = await import("@/app/api/cron/admin-summary/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalSent).toBe(0);
    expect(data.results[0].sent).toBe(false);
    expect(data.results[0].error).toBe("Failed to send email");
  });

  it("should skip when template is inactive", async () => {
    mockAdminSummaryConfigFindMany.mockResolvedValue([
      {
        id: "config-1",
        weddingId: "wedding-1",
        isEnabled: true,
        frequencyDays: 7,
        lastRunAt: null,
        wedding: {
          id: "wedding-1",
          slug: "test-wedding",
          coupleName: "Test Couple",
          weddingDate: new Date("2027-12-01"),
          emailFromName: "Test",
          emailFromAddress: "rsvp@test.com",
          notificationEmails: "admin@example.com",
        },
      },
    ]);

    mockGuestFindMany.mockResolvedValue([]);
    mockRenderEmailTemplate.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/cron/admin-summary/route");
    const response = await GET(cronRequest("test-cron-secret") as never);
    const data = await response.json();

    expect(data.totalSent).toBe(0);
    expect(data.results[0].error).toBe(
      "Admin summary template inactive or not found",
    );
  });
});
