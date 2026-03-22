import { beforeEach, describe, expect, it, mock } from "bun:test";

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
const mockFindMany = mock(() => Promise.resolve([]));

mock.module("@/lib/db", () => ({
  db: {
    guest: {
      findMany: mockFindMany,
    },
  },
}));

describe("RSVP - Verify Invite Code", () => {
  beforeEach(() => {
    mockFindMany.mockClear();
  });

  it("should verify a valid invite code", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        lastName: "Doe",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
        rsvpStatus: "pending",
        plusOneAllowed: true,
      },
      {
        id: "guest-456",
        firstName: "John",
        lastName: "- Plus One",
        inviteCode: "ABCD-1234",
        isPlusOne: true,
        rsvpStatus: "pending",
        plusOneAllowed: false,
        primaryGuestId: "guest-123",
      },
    ]);

    const { GET } = await import("@/app/api/rsvp/verify/route");

    const request = new Request(
      "http://localhost:3000/api/rsvp/verify?code=ABCD-1234",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.guests).toBeDefined();
    expect(data.guests.length).toBe(2);
  });

  it("should handle case-insensitive invite codes", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        inviteCode: "ABCD-1234",
        isPlusOne: false,
      },
    ]);

    const { GET } = await import("@/app/api/rsvp/verify/route");

    const request = new Request(
      "http://localhost:3000/api/rsvp/verify?code=abcd-1234", // lowercase
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should return 404 for invalid invite code", async () => {
    mockFindMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/rsvp/verify/route");

    const request = new Request(
      "http://localhost:3000/api/rsvp/verify?code=INVALID-CODE",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Invalid invite code");
  });

  it("should require invite code", async () => {
    const { GET } = await import("@/app/api/rsvp/verify/route");

    const request = new Request("http://localhost:3000/api/rsvp/verify");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invite code is required");
  });
});

describe("RSVP - Deeplink", () => {
  beforeEach(() => {
    mockFindMany.mockClear();
  });

  it("should accept code from query parameter", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "guest-123",
        firstName: "John",
        inviteCode: "DEEP-LINK",
        isPlusOne: false,
        rsvpStatus: "pending",
      },
    ]);

    const { GET } = await import("@/app/api/rsvp/verify/route");

    // Simulating deeplink: /rsvp?code=DEEP-LINK
    const request = new Request(
      "http://localhost:3000/api/rsvp/verify?code=DEEP-LINK",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.guests[0].inviteCode).toBe("DEEP-LINK");
  });
});
