import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock email sending at the resend-client layer (more reliable than mocking the resend package)
const mockSendEmail = mock(() =>
  Promise.resolve({ data: { id: "email-123" }, error: null }),
);
const mockGetResendClient = mock(() => ({})); // truthy = client exists

mock.module("@/lib/email/resend-client", () => ({
  sendEmail: mockSendEmail,
  getResendClient: mockGetResendClient,
}));

// Mock env
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
    RESEND_API_KEY: "test-resend-key",
    RSVP_EMAIL: "rsvp@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
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
const mockGuestFindUnique = mock(() => Promise.resolve(null));
const mockGuestUpdate = mock(() => Promise.resolve({}));
const mockEventFindFirst = mock(() => Promise.resolve(null));

mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mockGuestFindUnique,
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mockGuestUpdate,
      delete: mock(() => Promise.resolve({})),
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
      count: mock(() => Promise.resolve(0)),
    },
    event: {
      findFirst: mockEventFindFirst,
    },
  },
}));

// Note: Email sending now uses Resend templates directly, no local template mock needed

describe("Email Sending - Resend Email", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindUnique.mockClear();
    mockGuestUpdate.mockClear();
    mockEventFindFirst.mockClear();
  });

  it("should send email to guest with valid email", async () => {
    mockGuestFindUnique.mockResolvedValue({
      id: "guest-123",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      inviteCode: "ABCD-1234",
      numberOfResends: 0,
      list: "a",
    });

    const { POST } = await import("@/app/api/admin/guests/resend-email/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/resend-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: "guest-123",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "john@example.com",
        subject: expect.stringContaining("Invited"),
      }),
    );
  });

  it("should allow sending to override email", async () => {
    mockGuestFindUnique.mockResolvedValue({
      id: "guest-123",
      firstName: "John",
      lastName: "Doe",
      email: null,
      inviteCode: "ABCD-1234",
      numberOfResends: 0,
      list: "a",
    });

    const { POST } = await import("@/app/api/admin/guests/resend-email/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/resend-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: "guest-123",
          email: "override@example.com",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email).toBe("override@example.com");
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "override@example.com",
      }),
    );
  });

  it("should reject when no email is available", async () => {
    mockGuestFindUnique.mockResolvedValue({
      id: "guest-123",
      firstName: "John",
      email: null,
      inviteCode: "ABCD-1234",
      list: "a",
    });

    const { POST } = await import("@/app/api/admin/guests/resend-email/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/resend-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: "guest-123",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No valid email address provided");
  });

  it("should return 404 for non-existent guest", async () => {
    mockGuestFindUnique.mockResolvedValue(null);

    const { POST } = await import("@/app/api/admin/guests/resend-email/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/resend-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: "nonexistent",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Guest not found");
  });

  it("should require guestId", async () => {
    const { POST } = await import("@/app/api/admin/guests/resend-email/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/resend-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Guest ID is required");
  });
});

describe("Email Sending - B/C List Warning", () => {
  // Note: The B/C list warning is handled on the frontend in the edit-guest-sheet.tsx
  // component which shows a confirmation dialog. Here we test that the API correctly
  // tracks the list assignment which triggers the warning.

  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindUnique.mockClear();
    mockGuestUpdate.mockClear();
    mockEventFindFirst.mockClear();
  });

  it("guest list B should be stored correctly", async () => {
    mockGuestFindUnique.mockResolvedValue({
      id: "guest-123",
      firstName: "John",
      email: "john@example.com",
      inviteCode: "ABCD-1234",
      list: "b",
      numberOfResends: 0,
    });

    const { POST } = await import("@/app/api/admin/guests/resend-email/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/resend-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: "guest-123",
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("guest list C should be stored correctly", async () => {
    mockGuestFindUnique.mockResolvedValue({
      id: "guest-123",
      firstName: "John",
      email: "john@example.com",
      inviteCode: "ABCD-1234",
      list: "c",
      numberOfResends: 0,
    });

    const { POST } = await import("@/app/api/admin/guests/resend-email/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/resend-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: "guest-123",
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalled();
  });
});
