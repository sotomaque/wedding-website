import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock email sending - must be a proper class
const mockSendEmail = mock(() => Promise.resolve({ id: "email-123" }));

class MockResend {
  emails = {
    send: mockSendEmail,
  };
}

mock.module("resend", () => ({
  Resend: MockResend,
}));

// Mock env
mock.module("@/env", () => ({
  env: {
    RESEND_API_KEY: "test-key",
    RSVP_EMAIL: "admin@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock next/cache
mock.module("next/cache", () => ({
  revalidatePath: () => {},
}));

// Mock next/server — after() runs the callback immediately in tests
mock.module("next/server", () => ({
  after: (fn: () => unknown) => fn(),
}));

// Mock email template
mock.module("@/lib/email/templates/rsvp-notification", () => ({
  getRsvpNotificationEmail: () => "<html>RSVP Notification</html>",
}));

// Mock db
const mockExecute = mock(() => Promise.resolve([]));
const mockExecuteTakeFirst = mock(() => Promise.resolve(undefined));
const mockUpdateSet = mock(() => {});
const mockInsertValues = mock(() => {});

mock.module("@/lib/db", () => ({
  db: {
    selectFrom: (table: string) => ({
      selectAll: () => ({
        where: () => ({
          execute: mockExecute,
          executeTakeFirst:
            table === "parties" ? mockExecuteTakeFirst : mockExecute,
        }),
      }),
      select: () => ({
        where: () => ({
          execute: mockExecute,
          executeTakeFirst:
            table === "parties" ? mockExecuteTakeFirst : mockExecute,
        }),
      }),
    }),
    updateTable: () => ({
      set: (data: unknown) => {
        mockUpdateSet(data);
        return {
          where: () => ({
            execute: () => Promise.resolve([]),
          }),
        };
      },
    }),
    insertInto: () => ({
      values: (data: unknown) => {
        mockInsertValues(data);
        return {
          execute: () => Promise.resolve([]),
        };
      },
    }),
  },
}));

describe("submitMultiGuestRSVP - Basic Scenarios", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockUpdateSet.mockClear();
    mockInsertValues.mockClear();
    // Default mock: no party found (triggers fallback to guests table)
    mockExecuteTakeFirst.mockResolvedValue(undefined);
  });

  it("should require invite code", async () => {
    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "",
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          attending: true,
          plusOneAllowed: false,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invite code is required");
  });

  it("should require at least one guest", async () => {
    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("At least one guest is required");
  });

  it("should return error for invalid invite code", async () => {
    mockExecute.mockResolvedValue([]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "INVALID",
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          attending: true,
          plusOneAllowed: false,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid invite code");
  });

  it("should submit RSVP for a single attending guest", async () => {
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
        three_and_under: false,
        party_id: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          lastName: "Doe",
          attending: true,
          dietaryRestrictions: "Vegetarian",
          plusOneAllowed: false,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        rsvp_status: "yes",
        first_name: "John",
        last_name: "Doe",
        dietary_restrictions: "Vegetarian",
      }),
    );
  });

  it("should submit RSVP for a single declining guest", async () => {
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
        three_and_under: false,
        party_id: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          attending: false,
          plusOneAllowed: false,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        rsvp_status: "no",
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Multi-Guest Party", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockUpdateSet.mockClear();
    mockInsertValues.mockClear();
    mockExecuteTakeFirst.mockResolvedValue(undefined);
  });

  it("should submit RSVP for multiple guests with mixed responses", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-1",
        first_name: "John",
        last_name: "Smith",
        email: "john@example.com",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        rsvp_status: "pending",
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        family: true,
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
      {
        id: "guest-2",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@example.com",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        rsvp_status: "pending",
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        family: true,
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
      {
        id: "guest-3",
        first_name: "Junior",
        last_name: "Smith",
        email: null,
        invite_code: "ABCD-1234",
        is_plus_one: false,
        rsvp_status: "pending",
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        family: true,
        under_21: true,
        three_and_under: false,
        party_id: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-1",
          firstName: "John",
          lastName: "Smith",
          attending: true,
          dietaryRestrictions: "None",
          plusOneAllowed: false,
        },
        {
          guestId: "guest-2",
          firstName: "Jane",
          lastName: "Smith",
          attending: true,
          dietaryRestrictions: "Vegetarian",
          plusOneAllowed: false,
        },
        {
          guestId: "guest-3",
          firstName: "Junior",
          lastName: "Smith",
          attending: false, // Junior not attending
          plusOneAllowed: false,
        },
      ],
    });

    expect(result.success).toBe(true);
    // Should have called update 3 times
    expect(mockUpdateSet).toHaveBeenCalledTimes(3);
  });

  it("should handle all guests declining", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-1",
        first_name: "John",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
      {
        id: "guest-2",
        first_name: "Jane",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-1",
          firstName: "John",
          attending: false,
          plusOneAllowed: false,
        },
        {
          guestId: "guest-2",
          firstName: "Jane",
          attending: false,
          plusOneAllowed: false,
        },
      ],
    });

    expect(result.success).toBe(true);
    // Both should be marked as "no"
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ rsvp_status: "no" }),
    );
  });
});

describe("submitMultiGuestRSVP - Plus-One Handling", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockUpdateSet.mockClear();
    mockInsertValues.mockClear();
    mockExecuteTakeFirst.mockResolvedValue(undefined);
  });

  it("should create new plus-one when guest with plus_one_allowed brings one", async () => {
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
        three_and_under: false,
        party_id: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          attending: true,
          plusOneAllowed: true,
          plusOneAttending: true,
          plusOneFirstName: "Partner",
          plusOneLastName: "Name",
          plusOneDietaryRestrictions: "Gluten-free",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Partner",
        last_name: "Name",
        is_plus_one: true,
        rsvp_status: "yes",
        dietary_restrictions: "Gluten-free",
        primary_guest_id: "guest-123",
      }),
    );
  });

  it("should update existing plus-one", async () => {
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
        three_and_under: false,
        party_id: null,
      },
      {
        id: "plus-one-456",
        first_name: "Old Partner",
        invite_code: "ABCD-1234",
        is_plus_one: true,
        primary_guest_id: "guest-123",
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          attending: true,
          plusOneAllowed: true,
          existingPlusOneId: "plus-one-456",
          plusOneAttending: true,
          plusOneFirstName: "New Partner",
          plusOneLastName: "Updated",
          plusOneDietaryRestrictions: "Vegan",
        },
      ],
    });

    expect(result.success).toBe(true);
    // Should have updated both primary guest and plus-one
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "New Partner",
        last_name: "Updated",
        rsvp_status: "yes",
        dietary_restrictions: "Vegan",
      }),
    );
  });

  it("should mark plus-one as not attending when primary declines", async () => {
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
        three_and_under: false,
        party_id: null,
      },
      {
        id: "plus-one-456",
        first_name: "Partner",
        invite_code: "ABCD-1234",
        is_plus_one: true,
        primary_guest_id: "guest-123",
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        rsvp_status: "yes",
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          attending: false, // Primary declining
          plusOneAllowed: true,
        },
      ],
    });

    expect(result.success).toBe(true);
    // Plus-one should be marked as "no"
    expect(mockUpdateSet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rsvp_status: "no",
      }),
    );
  });

  it("should handle multiple guests each with plus-ones", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-1",
        first_name: "John",
        email: "john@example.com",
        invite_code: "FAMILY-123",
        is_plus_one: false,
        plus_one_allowed: true,
        side: "groom",
        list: "a",
        family: true,
        under_21: false,
        three_and_under: false,
        party_id: "party-1",
      },
      {
        id: "guest-2",
        first_name: "Jane",
        email: "jane@example.com",
        invite_code: "FAMILY-123",
        is_plus_one: false,
        plus_one_allowed: true,
        side: "groom",
        list: "a",
        family: true,
        under_21: false,
        three_and_under: false,
        party_id: "party-1",
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "FAMILY-123",
      guests: [
        {
          guestId: "guest-1",
          firstName: "John",
          attending: true,
          plusOneAllowed: true,
          plusOneAttending: true,
          plusOneFirstName: "Partner 1",
        },
        {
          guestId: "guest-2",
          firstName: "Jane",
          attending: true,
          plusOneAllowed: true,
          plusOneAttending: true,
          plusOneFirstName: "Partner 2",
        },
      ],
    });

    expect(result.success).toBe(true);
    // Should insert two plus-ones
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Partner 1",
        primary_guest_id: "guest-1",
      }),
    );
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Partner 2",
        primary_guest_id: "guest-2",
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Under 21 and Three and Under", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockUpdateSet.mockClear();
    mockInsertValues.mockClear();
    mockExecuteTakeFirst.mockResolvedValue(undefined);
  });

  it("should save under21 and threeAndUnder flags for guests", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-1",
        first_name: "Adult",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
      {
        id: "guest-2",
        first_name: "Teen",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
      {
        id: "guest-3",
        first_name: "Toddler",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-1",
          firstName: "Adult",
          attending: true,
          under21: false,
          threeAndUnder: false,
          plusOneAllowed: false,
        },
        {
          guestId: "guest-2",
          firstName: "Teen",
          attending: true,
          under21: true,
          threeAndUnder: false,
          plusOneAllowed: false,
        },
        {
          guestId: "guest-3",
          firstName: "Toddler",
          attending: true,
          under21: true,
          threeAndUnder: true,
          plusOneAllowed: false,
        },
      ],
    });

    expect(result.success).toBe(true);
    // Check each update
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Adult",
        under_21: false,
        three_and_under: false,
      }),
    );
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Teen",
        under_21: true,
        three_and_under: false,
      }),
    );
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Toddler",
        under_21: true,
        three_and_under: true,
      }),
    );
  });

  it("should save under21 and threeAndUnder flags for plus-ones", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "Parent",
        email: "parent@example.com",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: true,
        side: "bride",
        list: "a",
        family: false,
        under_21: false,
        three_and_under: false,
        party_id: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-123",
          firstName: "Parent",
          attending: true,
          plusOneAllowed: true,
          plusOneAttending: true,
          plusOneFirstName: "Child",
          plusOneUnder21: true,
          plusOneThreeAndUnder: true,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Child",
        under_21: true,
        three_and_under: true,
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Shared Contact Information", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockUpdateSet.mockClear();
    mockInsertValues.mockClear();
    mockExecuteTakeFirst.mockResolvedValue(undefined);
  });

  it("should save shared contact info for all guests", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-1",
        first_name: "John",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
        mailing_address: null,
        phone_number: null,
        whatsapp: null,
        preferred_contact_method: null,
      },
      {
        id: "guest-2",
        first_name: "Jane",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
        mailing_address: null,
        phone_number: null,
        whatsapp: null,
        preferred_contact_method: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-1",
          firstName: "John",
          attending: true,
          plusOneAllowed: false,
        },
        {
          guestId: "guest-2",
          firstName: "Jane",
          attending: true,
          plusOneAllowed: false,
        },
      ],
      mailingAddress: "123 Main St, San Diego, CA",
      phoneNumber: "+15551234567",
      whatsapp: "+15551234567",
      preferredContactMethod: "text",
    });

    expect(result.success).toBe(true);
    // Both guests should have the same contact info
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        mailing_address: "123 Main St, San Diego, CA",
        phone_number: "+15551234567",
        whatsapp: "+15551234567",
        preferred_contact_method: "text",
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Travel Information", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockUpdateSet.mockClear();
    mockInsertValues.mockClear();
    mockExecuteTakeFirst.mockResolvedValue(undefined);
  });

  it("should save travel info for all guests in the party", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-1",
        first_name: "John",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
        arrival_date: null,
        departure_date: null,
      },
      {
        id: "guest-2",
        first_name: "Jane",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
        arrival_date: null,
        departure_date: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-1",
          firstName: "John",
          attending: true,
          plusOneAllowed: false,
        },
        {
          guestId: "guest-2",
          firstName: "Jane",
          attending: true,
          plusOneAllowed: false,
        },
      ],
      arrivalDate: "2026-09-10",
      arrivalTransport: "SAN",
      departureDate: "2026-09-14",
      departureTransport: "LAX",
      accommodationNotes: "Hotel del Coronado",
    });

    expect(result.success).toBe(true);
    // Both guests should receive the same travel info
    expect(mockUpdateSet).toHaveBeenCalledTimes(2);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        arrival_date: "2026-09-10",
        arrival_transport: "SAN",
        departure_date: "2026-09-14",
        departure_transport: "LAX",
        accommodation_notes: "Hotel del Coronado",
      }),
    );
  });

  it("should preserve existing travel info when new values are not provided", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-1",
        first_name: "John",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        plus_one_allowed: false,
        side: "bride",
        list: "a",
        under_21: false,
        three_and_under: false,
        party_id: null,
        arrival_date: "2026-09-10",
        arrival_transport: "SAN",
        departure_date: "2026-09-14",
        departure_transport: "LAX",
        accommodation_notes: "Airbnb",
      },
    ]);

    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-1",
          firstName: "John",
          attending: true,
          plusOneAllowed: false,
        },
      ],
      // No travel fields submitted
    });

    expect(result.success).toBe(true);
    // Should fall back to existing DB values
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        arrival_date: "2026-09-10",
        departure_date: "2026-09-14",
        accommodation_notes: "Airbnb",
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Notification Email", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockUpdateSet.mockClear();
    mockInsertValues.mockClear();
    mockExecuteTakeFirst.mockResolvedValue(undefined);
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
        three_and_under: false,
        party_id: null,
        rsvp_status: "yes",
      },
    ]);
  });

  it("should send notification email to admin on multi-guest RSVP", async () => {
    const { submitMultiGuestRSVP } = await import("@/app/rsvp/actions");

    await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [
        {
          guestId: "guest-123",
          firstName: "John",
          attending: true,
          plusOneAllowed: false,
        },
      ],
    });

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        template: expect.objectContaining({
          id: "rsvp-notification",
        }),
      }),
    );
  });
});
