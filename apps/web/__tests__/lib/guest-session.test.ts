import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock data
const mockPrimaryGuest = {
  id: "guest-123",
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  invite_code: "ABCD-1234",
  is_plus_one: false,
  rsvp_status: "pending" as const,
  clerk_user_id: null,
};

const mockPlusOne = {
  id: "guest-456",
  first_name: "Jane",
  last_name: "Doe",
  email: null,
  invite_code: "ABCD-1234",
  is_plus_one: true,
  rsvp_status: "pending" as const,
  clerk_user_id: null,
  primary_guest_id: "guest-123",
};

// Mock functions
const mockExecute = mock(() => Promise.resolve([]));
const mockExecuteTakeFirst = mock(() => Promise.resolve(undefined));
const mockUpdateExecute = mock(() => Promise.resolve(undefined));
const mockCurrentUser = mock(() => Promise.resolve(null));

// Mock db
mock.module("@/lib/db", () => ({
  db: {
    selectFrom: () => ({
      selectAll: () => ({
        where: () => ({
          where: () => ({
            executeTakeFirst: mockExecuteTakeFirst,
          }),
          execute: mockExecute,
          executeTakeFirst: mockExecuteTakeFirst,
        }),
        execute: mockExecute,
      }),
    }),
    updateTable: () => ({
      set: () => ({
        where: () => ({
          execute: mockUpdateExecute,
        }),
      }),
    }),
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
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockUpdateExecute.mockClear();
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
    mockExecute.mockResolvedValue([mockPrimaryGuest, mockPlusOne]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty("ABCD-1234");

    expect(result).not.toBeNull();
    expect(result?.inviteCode).toBe("ABCD-1234");
    expect(result?.primaryGuest.firstName).toBe("John");
    expect(result?.plusOne?.firstName).toBe("Jane");
    expect(result?.isLoggedIn).toBe(false);
  });

  it("should find guest by clerk_user_id when logged in", async () => {
    const mockUser = {
      id: "clerk-user-123",
      emailAddresses: [{ emailAddress: "john@example.com" }],
    };
    mockCurrentUser.mockResolvedValue(mockUser);

    // First call: find by clerk_user_id
    mockExecuteTakeFirst.mockResolvedValueOnce({
      ...mockPrimaryGuest,
      clerk_user_id: "clerk-user-123",
    });

    // Second call: get party by invite code
    mockExecute.mockResolvedValueOnce([
      { ...mockPrimaryGuest, clerk_user_id: "clerk-user-123" },
      mockPlusOne,
    ]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty();

    expect(result).not.toBeNull();
    expect(result?.isLoggedIn).toBe(true);
    expect(result?.primaryGuest.firstName).toBe("John");
  });

  it("should auto-link guest by email when logged in but no clerk_user_id link", async () => {
    const mockUser = {
      id: "clerk-user-new",
      emailAddresses: [{ emailAddress: "john@example.com" }],
    };
    mockCurrentUser.mockResolvedValue(mockUser);

    // First call: no guest by clerk_user_id
    mockExecuteTakeFirst
      .mockResolvedValueOnce(undefined)
      // Second call: find guest by email
      .mockResolvedValueOnce(mockPrimaryGuest);

    // Get party after auto-link
    mockExecute.mockResolvedValueOnce([mockPrimaryGuest, mockPlusOne]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty();

    expect(result).not.toBeNull();
    expect(result?.isLoggedIn).toBe(true);
    expect(result?.primaryGuest.email).toBe("john@example.com");

    // Verify auto-link was called
    expect(mockUpdateExecute).toHaveBeenCalled();
  });

  it("should not auto-link plus-one guests by email", async () => {
    const mockUser = {
      id: "clerk-user-new",
      emailAddresses: [{ emailAddress: "plusone@example.com" }],
    };
    mockCurrentUser.mockResolvedValue(mockUser);

    // First call: no guest by clerk_user_id
    mockExecuteTakeFirst
      .mockResolvedValueOnce(undefined)
      // Second call: no primary guest matches email (is_plus_one=false filter)
      .mockResolvedValueOnce(undefined);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty();

    // No auto-link should happen, no party returned
    expect(result).toBeNull();
    expect(mockUpdateExecute).not.toHaveBeenCalled();
  });

  it("should identify admin users", async () => {
    const mockAdmin = {
      id: "clerk-admin",
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    };
    mockCurrentUser.mockResolvedValue(mockAdmin);

    // Admin with linked guest
    mockExecuteTakeFirst.mockResolvedValueOnce({
      ...mockPrimaryGuest,
      clerk_user_id: "clerk-admin",
      email: "admin@example.com",
    });

    mockExecute.mockResolvedValueOnce([
      { ...mockPrimaryGuest, clerk_user_id: "clerk-admin" },
    ]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty();

    expect(result).not.toBeNull();
    expect(result?.isAdmin).toBe(true);
  });

  it("should handle case-insensitive invite codes", async () => {
    mockCurrentUser.mockResolvedValue(null);
    mockExecute.mockResolvedValue([mockPrimaryGuest]);

    const { getGuestParty } = await import("@/lib/auth/guest-session");
    const result = await getGuestParty("abcd-1234"); // lowercase

    expect(result).not.toBeNull();
    expect(result?.inviteCode).toBe("ABCD-1234"); // Should be normalized to uppercase
  });
});

describe("Guest Session - linkClerkUserToGuest", () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockExecuteTakeFirst.mockClear();
    mockUpdateExecute.mockClear();
    mockCurrentUser.mockClear();
  });

  it("should link user to guest by matching email", async () => {
    const mockUser = {
      id: "clerk-user-123",
      emailAddresses: [{ emailAddress: "john@example.com" }],
    };
    mockCurrentUser.mockResolvedValue(mockUser);
    mockExecute.mockResolvedValue([mockPrimaryGuest, mockPlusOne]);

    const { linkClerkUserToGuest } = await import("@/lib/auth/guest-session");
    const result = await linkClerkUserToGuest("clerk-user-123", "ABCD-1234");

    expect(result.success).toBe(true);
    expect(mockUpdateExecute).toHaveBeenCalled();
  });

  it("should link to primary guest when no email match", async () => {
    const mockUser = {
      id: "clerk-user-123",
      emailAddresses: [{ emailAddress: "different@example.com" }],
    };
    mockCurrentUser.mockResolvedValue(mockUser);
    mockExecute.mockResolvedValue([mockPrimaryGuest, mockPlusOne]);

    const { linkClerkUserToGuest } = await import("@/lib/auth/guest-session");
    const result = await linkClerkUserToGuest("clerk-user-123", "ABCD-1234");

    expect(result.success).toBe(true);
    expect(mockUpdateExecute).toHaveBeenCalled();
  });

  it("should fail when guest already linked to another user", async () => {
    const mockUser = {
      id: "clerk-user-new",
      emailAddresses: [{ emailAddress: "john@example.com" }],
    };
    mockCurrentUser.mockResolvedValue(mockUser);
    mockExecute.mockResolvedValue([
      { ...mockPrimaryGuest, clerk_user_id: "clerk-user-existing" },
    ]);

    const { linkClerkUserToGuest } = await import("@/lib/auth/guest-session");
    const result = await linkClerkUserToGuest("clerk-user-new", "ABCD-1234");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Guest already linked to another user");
  });

  it("should fail for invalid invite code", async () => {
    const mockUser = {
      id: "clerk-user-123",
      emailAddresses: [{ emailAddress: "john@example.com" }],
    };
    mockCurrentUser.mockResolvedValue(mockUser);
    mockExecute.mockResolvedValue([]);

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
