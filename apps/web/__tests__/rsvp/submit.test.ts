import { beforeEach, describe, expect, it, mock } from "bun:test";
import * as nextServer from "next/server";

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

// Mock next/server — track after() calls so we can assert notification was
// scheduled. Spread the real module so NextRequest/NextResponse stay exported:
// `mock.module` is process-global under `bun test`, so a partial stub here would
// bleed into sibling files that import NextRequest and break them on load.
const mockAfter = mock((fn: () => unknown) => fn());
mock.module("next/server", () => ({
  ...nextServer,
  after: mockAfter,
}));

// Mock email template
mock.module("@/lib/email/templates/rsvp-notification", () => ({
  getRsvpNotificationEmail: () => "<html>RSVP Notification</html>",
}));

// Mock wedding settings (must be before @/lib/db mock)
mock.module("@/lib/db/wedding-content-data", () => ({
  getWeddingSettings: mock(() =>
    Promise.resolve({
      id: "test-wedding-id",
      slug: "test-wedding",
      coupleName: "Test Couple",
      person1Name: "Person1",
      person2Name: "Person2",
      weddingDate: new Date("2026-07-30"),
      rsvpDeadline: "March 30th, 2026",
      timezone: "America/New_York",
      status: "published",
      contactEmail: "test@example.com",
      notificationEmails: "admin@example.com",
      emailFromName: "Test Couple",
      emailFromAddress: "rsvp@test-wedding.com",
      brandImageUrl: null,
      brandImageAlt: null,
      featureToggles: {
        hotels: true,
        vendors: true,
        thingsToDo: true,
        tripPlanner: true,
        registry: true,
        guestPhotos: true,
        slideshow: true,
      },
    }),
  ),
  getWeddingContentSections: mock(() => Promise.resolve({})),
}));

// Mock URL helper
mock.module("@/lib/url", () => ({
  weddingUrl: mock(
    (slug: string, path: string) => `http://localhost:3000/${slug}${path}`,
  ),
}));

// Mock email helpers
mock.module("@/lib/email/helpers", () => ({
  getEmailFromAddress: mock(() => "Test Couple <rsvp@test-wedding.com>"),
  getNotificationRecipients: mock(() => ["admin@example.com"]),
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

// Mock db
const mockGuestFindMany = mock(() => Promise.resolve([]));
const mockGuestFindFirst = mock(() => Promise.resolve(null));
const mockGuestUpdate = mock(() => Promise.resolve({}));
const mockGuestCreate = mock(() => Promise.resolve({}));
const mockPartyFindFirst = mock(() => Promise.resolve(null));

mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mockGuestFindMany,
      findFirst: mockGuestFindFirst,
      update: mockGuestUpdate,
      create: mockGuestCreate,
    },
    party: {
      findFirst: mockPartyFindFirst,
    },
    event: {
      findMany: mock(() => Promise.resolve([])),
    },
    guestEventInvite: {
      createMany: mock(() => Promise.resolve({ count: 0 })),
      updateMany: mock(() => Promise.resolve({ count: 0 })),
    },
  },
}));

describe("RSVP - Submit (Manual Entry)", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    // Default mock: no party found (triggers fallback to guests table)
    mockPartyFindFirst.mockResolvedValue(null);
    // Default mock: primary guest only
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        rsvpStatus: "pending",
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        family: false,
        under21: false,
        partyId: null,
      },
    ]);
  });

  it("should submit RSVP for attending guest", async () => {
    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      lastName: "Doe",
      attending: true,
      dietaryRestrictions: "None",
    });

    expect(result.success).toBe(true);
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "guest-123" },
        data: expect.objectContaining({
          rsvpStatus: "yes",
          firstName: "John",
          lastName: "Doe",
        }),
      }),
    );
  });

  it("should submit RSVP for declining guest", async () => {
    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: false,
    });

    expect(result.success).toBe(true);
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rsvpStatus: "no",
        }),
      }),
    );
  });

  it("should require invite code", async () => {
    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "",
      firstName: "John",
      attending: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invite code is required");
  });

  it("should return error for invalid invite code", async () => {
    mockGuestFindMany.mockResolvedValue([]);

    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

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
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    // Default mock: no party found (triggers fallback to guests table)
    mockPartyFindFirst.mockResolvedValue(null);
  });

  it("Scenario 1: Primary declines - plus one should be marked as no", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: true,
        side: "bride",
        list: "a",
        under21: false,
      },
    ]);
    mockGuestFindFirst.mockResolvedValue({
      id: "guest-456",
      firstName: "Jane",
      inviteCode: "ABCD-1234",
      isPlusOne: true,
      primaryGuestId: "guest-123",
      under21: false,
    });

    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: false, // Primary declining
    });

    expect(result.success).toBe(true);
    // Should have been called twice - once for primary, once for plus one
    expect(mockGuestUpdate).toHaveBeenCalledTimes(2);
    // Plus one should be marked as no
    expect(mockGuestUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rsvpStatus: "no",
        }),
      }),
    );
  });

  it("Scenario 2a: Primary accepts with plus one attending", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        email: "john@example.com",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: true,
        side: "bride",
        list: "a",
        family: false,
        under21: false,
      },
    ]);
    mockGuestFindFirst.mockResolvedValue({
      id: "guest-456",
      firstName: "Placeholder",
      lastName: "- Plus One",
      inviteCode: "ABCD-1234",
      isPlusOne: true,
      primaryGuestId: "guest-123",
      under21: false,
    });

    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

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
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Jane",
          lastName: "Smith",
          rsvpStatus: "yes",
          dietaryRestrictions: "Vegetarian",
        }),
      }),
    );
  });

  it("Scenario 2b: Primary accepts but plus one declines", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: true,
        side: "bride",
        list: "a",
        under21: false,
      },
    ]);
    mockGuestFindFirst.mockResolvedValue({
      id: "guest-456",
      firstName: "Jane",
      inviteCode: "ABCD-1234",
      isPlusOne: true,
      primaryGuestId: "guest-123",
      under21: false,
    });

    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      plusOneAttending: false, // Plus one not attending
    });

    expect(result.success).toBe(true);
    // Plus one should be marked as not attending
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rsvpStatus: "no",
        }),
      }),
    );
  });

  it("should create plus one if none exists but guest has plusOneAllowed", async () => {
    // Only primary guest returned (no existing plus one record)
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        email: "john@example.com",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: true,
        side: "bride",
        list: "a",
        family: false,
        under21: false,
        partyId: "party-1",
      },
    ]);
    // No existing plus-one
    mockGuestFindFirst.mockResolvedValue(null);

    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      plusOneAttending: true,
      plusOneFirstName: "Jane",
      plusOneLastName: "Doe",
    });

    expect(result.success).toBe(true);
    // Should have created a new plus one
    expect(mockGuestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Jane",
          lastName: "Doe",
          isPlusOne: true,
          rsvpStatus: "yes",
          primaryGuestId: "guest-123",
        }),
      }),
    );
  });
});

describe("RSVP - Contact Information", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    // Default mock: no party found (triggers fallback to guests table)
    mockPartyFindFirst.mockResolvedValue(null);
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        partyId: null,
      },
    ]);
  });

  it("should save mailing address", async () => {
    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      mailingAddress: "123 Main St, San Diego, CA",
    });

    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mailingAddress: "123 Main St, San Diego, CA",
        }),
      }),
    );
  });

  it("should save phone number", async () => {
    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      phoneNumber: "555-123-4567",
    });

    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phoneNumber: "555-123-4567",
        }),
      }),
    );
  });

  it("should save preferred contact method", async () => {
    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      preferredContactMethod: "whatsapp",
    });

    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preferredContactMethod: "whatsapp",
        }),
      }),
    );
  });

  it("should save under21 status", async () => {
    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
      under21: true,
    });

    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          under21: true,
        }),
      }),
    );
  });
});

describe("RSVP - Notification Email", () => {
  beforeEach(() => {
    mockAfter.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    // Default mock: no party found (triggers fallback to guests table)
    mockPartyFindFirst.mockResolvedValue(null);
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        email: "john@example.com",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        partyId: null,
      },
    ]);
  });

  it("should schedule notification email via after() on RSVP submission", async () => {
    const { submitRSVP } = await import("@/app/[slug]/(public)/rsvp/actions");

    const result = await submitRSVP({
      inviteCode: "ABCD-1234",
      firstName: "John",
      attending: true,
    });

    expect(result.success).toBe(true);
    // Verify that after() was called to schedule the notification callback
    expect(mockAfter).toHaveBeenCalled();
    expect(mockAfter.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
