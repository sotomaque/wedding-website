import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock data
const mockPrimaryGuest = {
  id: "guest-123",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  inviteCode: "ABCD-1234",
  isPlusOne: false,
  rsvpStatus: "pending" as const,
  clerkUserId: null,
};

const mockPlusOne = {
  id: "guest-456",
  firstName: "Jane",
  lastName: "Doe",
  email: null,
  inviteCode: "ABCD-1234",
  isPlusOne: true,
  rsvpStatus: "pending" as const,
  clerkUserId: null,
  primaryGuestId: "guest-123",
};

// Mock functions
const mockGuestFindMany = mock(() => Promise.resolve([]));
const mockGuestFindFirst = mock(() => Promise.resolve(null));
const mockGuestUpdate = mock(() => Promise.resolve({}));
const mockCurrentUser = mock(() => Promise.resolve(null));

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
mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mockGuestFindMany,
      findFirst: mockGuestFindFirst,
      update: mockGuestUpdate,
    },
    weddingAdmin: {
      findFirst: mock(() => Promise.resolve(null)),
    },
  },
}));

// Mock Clerk
mock.module("@clerk/nextjs/server", () => ({
  currentUser: mockCurrentUser,
}));

// Mock env
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
  },
}));

describe("Guest Session - getGuestParty", () => {
  beforeEach(() => {
    mockGuestFindMany.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestUpdate.mockClear();
    mockCurrentUser.mockClear();
  });

  it("should return null when no user and no invite code", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty();

    expect(result).toBeNull();
  });

  it("should find guest by invite code when not logged in", async () => {
    mockCurrentUser.mockResolvedValue(null);
    mockGuestFindMany.mockResolvedValue([mockPrimaryGuest, mockPlusOne]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty("ABCD-1234");

    expect(result).not.toBeNull();
    expect(result?.inviteCode).toBe("ABCD-1234");
    expect(result?.primaryGuest.firstName).toBe("John");
    expect(result?.plusOne?.firstName).toBe("Jane");
    expect(result?.isLoggedIn).toBe(false);
  });

  it("should find guest by clerkUserId when logged in", async () => {
    const mockUser = {
      id: "clerk-user-123",
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "john@example.com",
          verification: { status: "verified" },
        },
      ],
    };
    mockCurrentUser.mockResolvedValue(mockUser);

    // First call: find by clerkUserId
    mockGuestFindFirst.mockResolvedValueOnce({
      ...mockPrimaryGuest,
      clerkUserId: "clerk-user-123",
    });

    // Second call: get party by invite code
    mockGuestFindMany.mockResolvedValueOnce([
      { ...mockPrimaryGuest, clerkUserId: "clerk-user-123" },
      mockPlusOne,
    ]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty();

    expect(result).not.toBeNull();
    expect(result?.isLoggedIn).toBe(true);
    expect(result?.primaryGuest.firstName).toBe("John");
  });

  it("should auto-link guest by email when logged in but no clerkUserId link", async () => {
    const mockUser = {
      id: "clerk-user-new",
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "john@example.com",
          verification: { status: "verified" },
        },
      ],
    };
    mockCurrentUser.mockResolvedValue(mockUser);

    // First call: no guest by clerkUserId
    mockGuestFindFirst
      .mockResolvedValueOnce(null)
      // Second call: find guest by email
      .mockResolvedValueOnce(mockPrimaryGuest);

    // Get party after auto-link
    mockGuestFindMany.mockResolvedValueOnce([mockPrimaryGuest, mockPlusOne]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty();

    expect(result).not.toBeNull();
    expect(result?.isLoggedIn).toBe(true);
    expect(result?.primaryGuest.email).toBe("john@example.com");

    // Verify auto-link was called
    expect(mockGuestUpdate).toHaveBeenCalled();
  });

  it("should not auto-link plus-one guests by email", async () => {
    const mockUser = {
      id: "clerk-user-new",
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "plusone@example.com",
          verification: { status: "verified" },
        },
      ],
    };
    mockCurrentUser.mockResolvedValue(mockUser);

    // First call: no guest by clerkUserId
    mockGuestFindFirst
      .mockResolvedValueOnce(null)
      // Second call: no primary guest matches email (isPlusOne=false filter)
      .mockResolvedValueOnce(null);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty();

    // No auto-link should happen, no party returned
    expect(result).toBeNull();
    expect(mockGuestUpdate).not.toHaveBeenCalled();
  });

  it("should identify admin users", async () => {
    const mockAdmin = {
      id: "clerk-admin",
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "admin@example.com",
          verification: { status: "verified" },
        },
      ],
    };
    mockCurrentUser.mockResolvedValue(mockAdmin);

    // Admin with linked guest
    mockGuestFindFirst.mockResolvedValueOnce({
      ...mockPrimaryGuest,
      clerkUserId: "clerk-admin",
      email: "admin@example.com",
    });

    mockGuestFindMany.mockResolvedValueOnce([
      { ...mockPrimaryGuest, clerkUserId: "clerk-admin" },
    ]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty();

    expect(result).not.toBeNull();
    expect(result?.isAdmin).toBe(true);
  });

  it("should handle case-insensitive invite codes", async () => {
    mockCurrentUser.mockResolvedValue(null);
    mockGuestFindMany.mockResolvedValue([mockPrimaryGuest]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty("abcd-1234"); // lowercase

    expect(result).not.toBeNull();
    expect(result?.inviteCode).toBe("ABCD-1234"); // Should be normalized to uppercase
  });
});

describe("Guest Session - linkClerkUserToGuest", () => {
  beforeEach(() => {
    mockGuestFindMany.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestUpdate.mockClear();
    mockCurrentUser.mockClear();
  });

  it("should link user to guest by matching email", async () => {
    const mockUser = {
      id: "clerk-user-123",
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "john@example.com",
          verification: { status: "verified" },
        },
      ],
    };
    mockCurrentUser.mockResolvedValue(mockUser);
    mockGuestFindMany.mockResolvedValue([mockPrimaryGuest, mockPlusOne]);

    const { linkClerkUserToGuest } = await import("@/lib/auth/guest-session");
    const result = await linkClerkUserToGuest("clerk-user-123", "ABCD-1234");

    expect(result.success).toBe(true);
    expect(mockGuestUpdate).toHaveBeenCalled();
  });

  it("should link to primary guest when no email match", async () => {
    const mockUser = {
      id: "clerk-user-123",
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "different@example.com",
          verification: { status: "verified" },
        },
      ],
    };
    mockCurrentUser.mockResolvedValue(mockUser);
    mockGuestFindMany.mockResolvedValue([mockPrimaryGuest, mockPlusOne]);

    const { linkClerkUserToGuest } = await import("@/lib/auth/guest-session");
    const result = await linkClerkUserToGuest("clerk-user-123", "ABCD-1234");

    expect(result.success).toBe(true);
    expect(mockGuestUpdate).toHaveBeenCalled();
  });

  it("should fail when guest already linked to another user", async () => {
    const mockUser = {
      id: "clerk-user-new",
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "john@example.com",
          verification: { status: "verified" },
        },
      ],
    };
    mockCurrentUser.mockResolvedValue(mockUser);
    mockGuestFindMany.mockResolvedValue([
      { ...mockPrimaryGuest, clerkUserId: "clerk-user-existing" },
    ]);

    const { linkClerkUserToGuest } = await import("@/lib/auth/guest-session");
    const result = await linkClerkUserToGuest("clerk-user-new", "ABCD-1234");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Guest already linked to another user");
  });

  it("should fail for invalid invite code", async () => {
    const mockUser = {
      id: "clerk-user-123",
      primaryEmailAddressId: "email-primary",
      emailAddresses: [
        {
          id: "email-primary",
          emailAddress: "john@example.com",
          verification: { status: "verified" },
        },
      ],
    };
    mockCurrentUser.mockResolvedValue(mockUser);
    mockGuestFindMany.mockResolvedValue([]);

    const { linkClerkUserToGuest } = await import("@/lib/auth/guest-session");
    const result = await linkClerkUserToGuest("clerk-user-123", "INVALID-CODE");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid invite code");
  });

  it("should fail when not authenticated", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const { linkClerkUserToGuest } = await import("@/lib/auth/guest-session");
    const result = await linkClerkUserToGuest("clerk-user-123", "ABCD-1234");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});
