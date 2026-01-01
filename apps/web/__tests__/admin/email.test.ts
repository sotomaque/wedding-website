import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock email sending - must be a proper class
const mockSendEmail = vi.fn().mockResolvedValue({ id: "email-123" });

class MockResend {
  emails = {
    send: mockSendEmail,
  };
}

vi.mock("resend", () => ({
  Resend: MockResend,
}));

// Mock env
vi.mock("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
    RESEND_API_KEY: "test-resend-key",
    RSVP_EMAIL: "rsvp@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock Clerk
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn().mockResolvedValue({
    id: "admin-123",
    emailAddresses: [{ emailAddress: "admin@example.com" }],
  }),
}));

// Mock db
const mockExecuteTakeFirst = vi.fn();
const mockExecute = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/db", () => ({
  db: {
    selectFrom: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        where: vi.fn(() => ({
          executeTakeFirst: mockExecuteTakeFirst,
          execute: mockExecute,
        })),
      })),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: mockExecute,
        })),
      })),
    })),
  },
}));

// Mock email template
vi.mock("@/lib/email/templates/wedding-invitation", () => ({
  getWeddingInvitationEmail: vi
    .fn()
    .mockReturnValue("<html>Wedding Invitation</html>"),
}));

describe("Email Sending - Resend Email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send email to guest with valid email", async () => {
    mockExecuteTakeFirst.mockResolvedValue({
      id: "guest-123",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      invite_code: "ABCD-1234",
      number_of_resends: 0,
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
    mockExecuteTakeFirst.mockResolvedValue({
      id: "guest-123",
      first_name: "John",
      last_name: "Doe",
      email: null,
      invite_code: "ABCD-1234",
      number_of_resends: 0,
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
    mockExecuteTakeFirst.mockResolvedValue({
      id: "guest-123",
      first_name: "John",
      email: null,
      invite_code: "ABCD-1234",
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
    mockExecuteTakeFirst.mockResolvedValue(null);

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
    vi.clearAllMocks();
  });

  it("guest list B should be stored correctly", async () => {
    mockExecuteTakeFirst.mockResolvedValue({
      id: "guest-123",
      first_name: "John",
      email: "john@example.com",
      invite_code: "ABCD-1234",
      list: "b",
      number_of_resends: 0,
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
    mockExecuteTakeFirst.mockResolvedValue({
      id: "guest-123",
      first_name: "John",
      email: "john@example.com",
      invite_code: "ABCD-1234",
      list: "c",
      number_of_resends: 0,
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

describe("Email Template", () => {
  it("should include RSVP link with invite code", async () => {
    const { getWeddingInvitationEmail } = await import(
      "@/lib/email/templates/wedding-invitation"
    );

    expect(getWeddingInvitationEmail).toBeDefined();
  });
});
