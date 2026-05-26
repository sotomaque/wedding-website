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

// Mock next/server — track after() calls so we can assert notification was scheduled
const mockAfter = mock((fn: () => unknown) => fn());
mock.module("next/server", () => ({
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
const mockGuestUpdate = mock(() => Promise.resolve({}));
const mockGuestCreate = mock(() => Promise.resolve({}));
const mockPartyFindFirst = mock(() => Promise.resolve(null));

mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mockGuestFindMany,
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

describe("submitMultiGuestRSVP - Basic Scenarios", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    // Default mock: no party found (triggers fallback to guests table)
    mockPartyFindFirst.mockResolvedValue(null);
  });

  it("should require invite code", async () => {
    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

    const result = await submitMultiGuestRSVP({
      inviteCode: "ABCD-1234",
      guests: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("At least one guest is required");
  });

  it("should return error for invalid invite code", async () => {
    mockGuestFindMany.mockResolvedValue([]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
        threeAndUnder: false,
        partyId: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rsvpStatus: "yes",
          firstName: "John",
          lastName: "Doe",
          dietaryRestrictions: "Vegetarian",
        }),
      }),
    );
  });

  it("should submit RSVP for a single declining guest", async () => {
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
        threeAndUnder: false,
        partyId: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rsvpStatus: "no",
        }),
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Multi-Guest Party", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    mockPartyFindFirst.mockResolvedValue(null);
  });

  it("should submit RSVP for multiple guests with mixed responses", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        rsvpStatus: "pending",
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        family: true,
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
      {
        id: "guest-2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        rsvpStatus: "pending",
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        family: true,
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
      {
        id: "guest-3",
        firstName: "Junior",
        lastName: "Smith",
        email: null,
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        rsvpStatus: "pending",
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        family: true,
        under21: true,
        threeAndUnder: false,
        partyId: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenCalledTimes(3);
  });

  it("should handle all guests declining", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "John",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
      {
        id: "guest-2",
        firstName: "Jane",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rsvpStatus: "no" }),
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Plus-One Handling", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    mockPartyFindFirst.mockResolvedValue(null);
  });

  it("should create new plus-one when guest with plusOneAllowed brings one", async () => {
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
        threeAndUnder: false,
        partyId: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Partner",
          lastName: "Name",
          isPlusOne: true,
          rsvpStatus: "yes",
          dietaryRestrictions: "Gluten-free",
          primaryGuestId: "guest-123",
        }),
      }),
    );
  });

  it("should update existing plus-one", async () => {
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
        threeAndUnder: false,
        partyId: null,
      },
      {
        id: "plus-one-456",
        firstName: "Old Partner",
        inviteCode: "ABCD-1234",
        isPlusOne: true,
        primaryGuestId: "guest-123",
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "New Partner",
          lastName: "Updated",
          rsvpStatus: "yes",
          dietaryRestrictions: "Vegan",
        }),
      }),
    );
  });

  it("should mark plus-one as not attending when primary declines", async () => {
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
        threeAndUnder: false,
        partyId: null,
      },
      {
        id: "plus-one-456",
        firstName: "Partner",
        inviteCode: "ABCD-1234",
        isPlusOne: true,
        primaryGuestId: "guest-123",
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        rsvpStatus: "yes",
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rsvpStatus: "no",
        }),
      }),
    );
  });

  it("should handle multiple guests each with plus-ones", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "John",
        email: "john@example.com",
        inviteCode: "FAMILY-123",
        isPlusOne: false,
        plusOneAllowed: true,
        side: "groom",
        list: "a",
        family: true,
        under21: false,
        threeAndUnder: false,
        partyId: "party-1",
      },
      {
        id: "guest-2",
        firstName: "Jane",
        email: "jane@example.com",
        inviteCode: "FAMILY-123",
        isPlusOne: false,
        plusOneAllowed: true,
        side: "groom",
        list: "a",
        family: true,
        under21: false,
        threeAndUnder: false,
        partyId: "party-1",
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    // Should create two plus-ones
    expect(mockGuestCreate).toHaveBeenCalledTimes(2);
    expect(mockGuestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Partner 1",
          primaryGuestId: "guest-1",
        }),
      }),
    );
    expect(mockGuestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Partner 2",
          primaryGuestId: "guest-2",
        }),
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Under 21 and Three and Under", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    mockPartyFindFirst.mockResolvedValue(null);
  });

  it("should save under21 and threeAndUnder flags for guests", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "Adult",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
      {
        id: "guest-2",
        firstName: "Teen",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
      {
        id: "guest-3",
        firstName: "Toddler",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Adult",
          under21: false,
          threeAndUnder: false,
        }),
      }),
    );
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Teen",
          under21: true,
          threeAndUnder: false,
        }),
      }),
    );
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Toddler",
          under21: true,
          threeAndUnder: true,
        }),
      }),
    );
  });

  it("should save under21 and threeAndUnder flags for plus-ones", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "Parent",
        email: "parent@example.com",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: true,
        side: "bride",
        list: "a",
        family: false,
        under21: false,
        threeAndUnder: false,
        partyId: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Child",
          under21: true,
          threeAndUnder: true,
        }),
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Shared Contact Information", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    mockPartyFindFirst.mockResolvedValue(null);
  });

  it("should save shared contact info for all guests", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "John",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
        mailingAddress: null,
        phoneNumber: null,
        whatsapp: null,
        preferredContactMethod: null,
      },
      {
        id: "guest-2",
        firstName: "Jane",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
        mailingAddress: null,
        phoneNumber: null,
        whatsapp: null,
        preferredContactMethod: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mailingAddress: "123 Main St, San Diego, CA",
          phoneNumber: "+15551234567",
          whatsapp: "+15551234567",
          preferredContactMethod: "text",
        }),
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Travel Information", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
    mockPartyFindFirst.mockResolvedValue(null);
  });

  it("should save travel info for all guests in the party", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "John",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
        arrivalDate: null,
        departureDate: null,
      },
      {
        id: "guest-2",
        firstName: "Jane",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
        arrivalDate: null,
        departureDate: null,
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenCalledTimes(2);
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          arrivalDate: "2026-09-10",
          arrivalTransport: "SAN",
          departureDate: "2026-09-14",
          departureTransport: "LAX",
          accommodationNotes: "Hotel del Coronado",
        }),
      }),
    );
  });

  it("should preserve existing travel info when new values are not provided", async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: "guest-1",
        firstName: "John",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        plusOneAllowed: false,
        side: "bride",
        list: "a",
        under21: false,
        threeAndUnder: false,
        partyId: null,
        arrivalDate: "2026-09-10",
        arrivalTransport: "SAN",
        departureDate: "2026-09-14",
        departureTransport: "LAX",
        accommodationNotes: "Airbnb",
      },
    ]);

    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

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
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          arrivalDate: "2026-09-10",
          departureDate: "2026-09-14",
          accommodationNotes: "Airbnb",
        }),
      }),
    );
  });
});

describe("submitMultiGuestRSVP - Notification Email", () => {
  beforeEach(() => {
    mockAfter.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestCreate.mockClear();
    mockPartyFindFirst.mockClear();
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
        threeAndUnder: false,
        partyId: null,
        rsvpStatus: "yes",
      },
    ]);
  });

  it("should schedule notification email via after() on multi-guest RSVP", async () => {
    const { submitMultiGuestRSVP } = await import(
      "@/app/[slug]/(public)/rsvp/actions"
    );

    const result = await submitMultiGuestRSVP({
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

    expect(result.success).toBe(true);
    // Verify that after() was called to schedule the notification callback
    expect(mockAfter).toHaveBeenCalled();
    expect(mockAfter.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
