import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock env
mock.module("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
    RESEND_API_KEY: "test-key",
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

// Create Prisma-style db mocks
const mockGuestFindMany = mock(() => Promise.resolve([]));
const mockGuestFindUnique = mock(() => Promise.resolve(null));
const mockGuestFindFirst = mock(() => Promise.resolve(null));
const mockGuestCreate = mock(() => Promise.resolve({}));
const mockGuestUpdate = mock(() => Promise.resolve({}));
const mockGuestDelete = mock(() => Promise.resolve({}));
const mockGuestDeleteMany = mock(() => Promise.resolve({ count: 0 }));
const mockGuestCount = mock(() => Promise.resolve(0));

const mockPartyFindUnique = mock(() => Promise.resolve(null));
const mockPartyCreate = mock(() =>
  Promise.resolve({ id: "party-123", inviteCode: "ABCD-1234" }),
);
const mockPartyDelete = mock(() => Promise.resolve({}));

const mockEventFindFirst = mock(() => Promise.resolve(null));

mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mockGuestFindMany,
      findUnique: mockGuestFindUnique,
      findFirst: mockGuestFindFirst,
      create: mockGuestCreate,
      update: mockGuestUpdate,
      delete: mockGuestDelete,
      deleteMany: mockGuestDeleteMany,
      count: mockGuestCount,
    },
    party: {
      findUnique: mockPartyFindUnique,
      create: mockPartyCreate,
      delete: mockPartyDelete,
    },
    event: {
      findFirst: mockEventFindFirst,
    },
  },
}));

// Mock email sending (sendEmail is used in the guest route)
mock.module("@/lib/email/resend-client", () => ({
  sendEmail: mock(() =>
    Promise.resolve({ data: { id: "email-123" }, error: null }),
  ),
  getResendClient: () => ({
    emails: { send: mock(() => Promise.resolve({})) },
  }),
}));

mock.module("@/lib/email/constants", () => ({
  WEDDING_INVITATION_TEMPLATE_ALIAS: "wedding-invitation",
}));

// Note: Email sending now uses Resend templates directly, no local template mock needed

describe("Guest CRUD - Create User", () => {
  beforeEach(() => {
    mockGuestFindMany.mockClear();
    mockGuestFindUnique.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestCreate.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestDelete.mockClear();
    mockGuestDeleteMany.mockClear();
    mockGuestCount.mockClear();
    mockPartyFindUnique.mockClear();
    mockPartyCreate.mockClear();
    mockPartyDelete.mockClear();

    mockGuestCreate.mockResolvedValue({
      id: "guest-123",
      firstName: "John",
      lastName: "Doe",
      inviteCode: "ABCD-1234",
      plusOneAllowed: false,
    });
    mockPartyFindUnique.mockResolvedValue(null); // No existing party with that invite code
    mockPartyCreate.mockResolvedValue({
      id: "party-123",
      inviteCode: "ABCD-1234",
    });
  });

  it("should create a new guest", async () => {
    const { POST } = await import("@/app/api/admin/guests/route");

    const request = new Request("http://localhost:3000/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        side: "bride",
        list: "a",
        plusOneAllowed: false,
        sendEmail: false,
        family: false,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.guest).toBeDefined();
    expect(mockGuestCreate).toHaveBeenCalled();
  });

  it("should require firstName", async () => {
    const { POST } = await import("@/app/api/admin/guests/route");

    const request = new Request("http://localhost:3000/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastName: "Doe",
        side: "bride",
        list: "a",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("First name is required");
  });

  it("should create plus one when plusOneAllowed is true", async () => {
    mockGuestCreate
      .mockResolvedValueOnce({
        id: "guest-123",
        firstName: "John",
        lastName: "Doe",
        inviteCode: "ABCD-1234",
        plusOneAllowed: true,
      })
      .mockResolvedValueOnce({
        id: "plus-one-123",
        firstName: "Jane",
        lastName: null,
        isPlusOne: true,
      });

    const { POST } = await import("@/app/api/admin/guests/route");

    const request = new Request("http://localhost:3000/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        side: "bride",
        list: "a",
        plusOneAllowed: true,
        plusOneFirstName: "Jane",
        sendEmail: false,
        family: false,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.guest).toBeDefined();
    // Primary guest and plus one should both be created
    expect(mockGuestCreate).toHaveBeenCalledTimes(2);
    // First create call should have plusOneAllowed: true
    expect(mockGuestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "John",
          plusOneAllowed: true,
        }),
      }),
    );
  });
});

describe("Guest CRUD - Edit User", () => {
  beforeEach(() => {
    mockGuestFindMany.mockClear();
    mockGuestFindUnique.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestCreate.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestDelete.mockClear();
    mockGuestDeleteMany.mockClear();
    mockGuestCount.mockClear();
    mockPartyFindUnique.mockClear();
    mockPartyCreate.mockClear();
    mockPartyDelete.mockClear();

    const guestData = {
      id: "guest-123",
      firstName: "John",
      lastName: "Doe",
      inviteCode: "ABCD-1234",
      plusOneAllowed: false,
      side: "bride",
      list: "a",
      partyId: "party-123",
      weddingId: "test-wedding-id",
    };
    mockGuestFindUnique.mockResolvedValue(guestData);
    mockGuestFindFirst.mockResolvedValue(guestData);
    mockGuestUpdate.mockResolvedValue({
      id: "guest-123",
      firstName: "John",
      lastName: "Doe",
    });
  });

  it("should update guest details", async () => {
    mockGuestUpdate.mockResolvedValue({
      id: "guest-123",
      firstName: "Johnny",
      lastName: "Doe",
      side: "groom",
      family: true,
    });

    const { PATCH } = await import("@/app/api/admin/guests/[id]/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/guest-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Johnny",
          lastName: "Doe",
          side: "groom",
          list: "a",
          plusOneAllowed: false,
          family: true,
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "guest-123" }),
    });

    expect(response.status).toBe(200);
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "guest-123" },
        data: expect.objectContaining({
          firstName: "Johnny",
          side: "groom",
          family: true,
        }),
      }),
    );
  });

  it("should change list assignment", async () => {
    const { PATCH } = await import("@/app/api/admin/guests/[id]/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/guest-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
          side: "bride",
          list: "b",
          plusOneAllowed: false,
          family: false,
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "guest-123" }),
    });

    expect(response.status).toBe(200);
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          list: "b",
        }),
      }),
    );
  });

  it("should add plus one when enabling plusOneAllowed", async () => {
    const guestData = {
      id: "guest-123",
      firstName: "John",
      lastName: "Doe",
      inviteCode: "ABCD-1234",
      plusOneAllowed: false,
      side: "bride",
      list: "a",
      partyId: "party-123",
      weddingId: "test-wedding-id",
    };
    // findUnique returns the current guest
    mockGuestFindUnique.mockResolvedValue(guestData);

    // findFirst: plus-one lookup returns null (no existing plus-one)
    mockGuestFindFirst.mockResolvedValue(null);

    // update returns updated guest
    mockGuestUpdate.mockResolvedValue({
      id: "guest-123",
      firstName: "John",
      lastName: "Doe",
    });

    // create returns new plus one
    mockGuestCreate.mockResolvedValue({
      id: "plus-one-123",
      firstName: "Jane",
      isPlusOne: true,
    });

    const { PATCH } = await import("@/app/api/admin/guests/[id]/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/guest-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
          side: "bride",
          list: "a",
          plusOneAllowed: true,
          plusOneFirstName: "Jane",
          family: false,
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "guest-123" }),
    });

    expect(response.status).toBe(200);
    // Should have created a plus one
    expect(mockGuestCreate).toHaveBeenCalled();
  });

  it("should return 404 for non-existent guest", async () => {
    mockGuestFindUnique.mockResolvedValue(null);

    const { PATCH } = await import("@/app/api/admin/guests/[id]/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/nonexistent",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Guest not found");
  });
});

describe("Guest CRUD - Delete User", () => {
  beforeEach(() => {
    mockGuestFindMany.mockClear();
    mockGuestFindUnique.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestCreate.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestDelete.mockClear();
    mockGuestDeleteMany.mockClear();
    mockGuestCount.mockClear();
    mockPartyFindUnique.mockClear();
    mockPartyCreate.mockClear();
    mockPartyDelete.mockClear();
  });

  it("should delete a guest", async () => {
    const guestData = {
      id: "guest-123",
      weddingId: "test-wedding-id",
    };
    mockGuestFindUnique.mockResolvedValue(guestData);
    mockGuestFindFirst.mockResolvedValue(guestData);
    const { DELETE } = await import("@/app/api/admin/guests/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests?id=guest-123",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGuestDelete).toHaveBeenCalledWith({
      where: { id: "guest-123" },
    });
  });

  it("should require guest ID", async () => {
    const { DELETE } = await import("@/app/api/admin/guests/route");

    const request = new Request("http://localhost:3000/api/admin/guests", {
      method: "DELETE",
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Guest ID is required");
  });
});

describe("Guest CRUD - List Assignment (A/B/C)", () => {
  beforeEach(() => {
    mockGuestFindMany.mockClear();
    mockGuestFindUnique.mockClear();
    mockGuestFindFirst.mockClear();
    mockGuestCreate.mockClear();
    mockGuestUpdate.mockClear();
    mockGuestDelete.mockClear();
    mockGuestDeleteMany.mockClear();
    mockGuestCount.mockClear();
    mockPartyFindUnique.mockClear();
    mockPartyCreate.mockClear();
    mockPartyDelete.mockClear();

    const guestData = {
      id: "guest-123",
      firstName: "John",
      inviteCode: "ABCD-1234",
      side: "bride",
      list: "a",
      partyId: "party-123",
      weddingId: "test-wedding-id",
    };
    mockGuestFindUnique.mockResolvedValue(guestData);
    mockGuestFindFirst.mockResolvedValue(guestData);
    mockGuestUpdate.mockResolvedValue({
      id: "guest-123",
      firstName: "John",
    });
  });

  it("should allow setting list to A", async () => {
    const { PATCH } = await import("@/app/api/admin/guests/[id]/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/guest-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
          side: "bride",
          list: "a",
          plusOneAllowed: false,
          family: false,
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "guest-123" }),
    });

    expect(response.status).toBe(200);
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ list: "a" }),
      }),
    );
  });

  it("should allow setting list to B", async () => {
    const { PATCH } = await import("@/app/api/admin/guests/[id]/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/guest-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
          side: "bride",
          list: "b",
          plusOneAllowed: false,
          family: false,
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "guest-123" }),
    });

    expect(response.status).toBe(200);
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ list: "b" }),
      }),
    );
  });

  it("should allow setting list to C", async () => {
    const { PATCH } = await import("@/app/api/admin/guests/[id]/route");

    const request = new Request(
      "http://localhost:3000/api/admin/guests/guest-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "John",
          side: "bride",
          list: "c",
          plusOneAllowed: false,
          family: false,
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "guest-123" }),
    });

    expect(response.status).toBe(200);
    expect(mockGuestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ list: "c" }),
      }),
    );
  });
});
