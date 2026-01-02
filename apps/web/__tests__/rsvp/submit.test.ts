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
    RESEND_API_KEY: "test-key",
    RSVP_EMAIL: "admin@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock email template
vi.mock("@/lib/email/templates/rsvp-notification", () => ({
  getRsvpNotificationEmail: vi
    .fn()
    .mockReturnValue("<html>RSVP Notification</html>"),
}));

// Mock db
const mockExecute = vi.fn();
const mockUpdateSet = vi.fn();
const mockInsertValues = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    selectFrom: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: mockExecute,
        })),
      })),
      select: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: mockExecute,
        })),
      })),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn((data) => {
        mockUpdateSet(data);
        return {
          where: vi.fn(() => ({
            execute: vi.fn().mockResolvedValue([]),
          })),
        };
      }),
    })),
    insertInto: vi.fn(() => ({
      values: vi.fn((data) => {
        mockInsertValues(data);
        return {
          execute: vi.fn().mockResolvedValue([]),
        };
      }),
    })),
  },
}));

describe("RSVP - Submit (Manual Entry)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: primary guest only
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        rsvp_status: "pending",
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        family: false,
        under_21: false,
      },
    ]);
  });

  it("should submit RSVP for attending guest", async () => {
    const { submitRSVP } = await import("@/app/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      lastName: "Doe",
      attending: true,
      dietaryRestrictions: "None",
    });

    expect(result.success).toBe(true);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        rsvp_status: "yes",
        first_name: "John",
        last_name: "Doe",
      }),
    );
  });

  it("should submit RSVP for declining guest", async () => {
    const { submitRSVP } = await import("@/app/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: false,
    });

    expect(result.success).toBe(true);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        rsvp_status: "no",
      }),
    );
  });

  it("should require invite code", async () => {
    const { submitRSVP } = await import("@/app/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "",
      firstName: "John",
      attending: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invite code is required");
  });

  it("should return error for invalid invite code", async () => {
    mockExecute.mockResolvedValue([]);

    const { submitRSVP } = await import("@/app/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "INVALID",
      firstName: "John",
      attending: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid invite code");
  });
});

describe("RSVP - Plus One Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Scenario 1: Primary declines - plus one should be marked as no", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: true,
        side: "bride",
        list: "a",
        under_21: false,
      },
      {
        id: "guest-456",
        first_name: "Jane",
        invite_code: "ABCD-1234",
        is_plus_one: true,
        primary_guest_id: "guest-123",
        under_21: false,
      },
    ]);

    const { submitRSVP } = await import("@/app/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: false, // Primary declining
    });

    expect(result.success).toBe(true);
    // Should have been called twice - once for primary, once for plus one
    expect(mockUpdateSet).toHaveBeenCalledTimes(2);
    // Plus one should be marked as no
    expect(mockUpdateSet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rsvp_status: "no",
      }),
    );
  });

  it("Scenario 2a: Primary accepts with plus one attending", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        email: "john@example.com",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: true,
        side: "bride",
        list: "a",
        family: false,
        under_21: false,
      },
      {
        id: "guest-456",
        first_name: "Placeholder",
        last_name: "- Plus One",
        invite_code: "ABCD-1234",
        is_plus_one: true,
        primary_guest_id: "guest-123",
        under_21: false,
      },
    ]);

    const { submitRSVP } = await import("@/app/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      plusOneAttending: true,
      plusOneFirstName: "Jane",
      plusOneLastName: "Smith",
      plusOneDietaryRestrictions: "Vegetarian",
    });

    expect(result.success).toBe(true);
    // Plus one should be updated with details
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Jane",
        last_name: "Smith",
        rsvp_status: "yes",
        dietary_restrictions: "Vegetarian",
      }),
    );
  });

  it("Scenario 2b: Primary accepts but plus one declines", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: true,
        side: "bride",
        list: "a",
        under_21: false,
      },
      {
        id: "guest-456",
        first_name: "Jane",
        invite_code: "ABCD-1234",
        is_plus_one: true,
        primary_guest_id: "guest-123",
        under_21: false,
      },
    ]);

    const { submitRSVP } = await import("@/app/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      plusOneAttending: false, // Plus one not attending
    });

    expect(result.success).toBe(true);
    // Plus one should be marked as not attending
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        rsvp_status: "no",
      }),
    );
  });

  it("should create plus one if none exists but guest has plus_one_allowed", async () => {
    // Only primary guest returned (no existing plus one record)
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        email: "john@example.com",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: true,
        side: "bride",
        list: "a",
        family: false,
        under_21: false,
      },
    ]);

    const { submitRSVP } = await import("@/app/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      plusOneAttending: true,
      plusOneFirstName: "Jane",
      plusOneLastName: "Doe",
    });

    expect(result.success).toBe(true);
    // Should have inserted a new plus one
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Jane",
        last_name: "Doe",
        is_plus_one: true,
        rsvp_status: "yes",
        primary_guest_id: "guest-123",
      }),
    );
  });
});

describe("RSVP - Contact Information", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
      },
    ]);
  });

  it("should save mailing address", async () => {
    const { submitRSVP } = await import("@/app/rsvp/actions");

    await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      mailingAddress: "123 Main St, San Diego, CA",
    });

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        mailing_address: "123 Main St, San Diego, CA",
      }),
    );
  });

  it("should save phone number", async () => {
    const { submitRSVP } = await import("@/app/rsvp/actions");

    await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      phoneNumber: "555-123-4567",
    });

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        phone_number: "555-123-4567",
      }),
    );
  });

  it("should save preferred contact method", async () => {
    const { submitRSVP } = await import("@/app/rsvp/actions");

    await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      preferredContactMethod: "whatsapp",
    });

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        preferred_contact_method: "whatsapp",
      }),
    );
  });

  it("should save under_21 status", async () => {
    const { submitRSVP } = await import("@/app/rsvp/actions");

    await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      under21: true,
    });

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        under_21: true,
      }),
    );
  });
});

describe("RSVP - Notification Email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        email: "john@example.com",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
      },
    ]);
  });

  it("should send notification email to admin on RSVP submission", async () => {
    const { submitRSVP } = await import("@/app/rsvp/actions");

    await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
    });

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@example.com",
        subject: expect.stringContaining("RSVP"),
      }),
    );
  });
});
