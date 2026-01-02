import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock db
const mockExecute = mock(() => Promise.resolve([]));

mock.module("@/lib/db", () => ({
  db: {
    selectFrom: () => ({
      selectAll: () => ({
        where: () => ({
          execute: mockExecute,
        }),
      }),
    }),
  },
}));

describe("RSVP - Verify Invite Code", () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  it("should verify a valid invite code", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        last_name: "Doe",
        invite_code: "ABCD-1234",
        is_plus_one: false,
        rsvp_status: "pending",
        plus_one_allowed: true,
      },
      {
        id: "guest-456",
        first_name: "John",
        last_name: "- Plus One",
        invite_code: "ABCD-1234",
        is_plus_one: true,
        rsvp_status: "pending",
        plus_one_allowed: false,
        primary_guest_id: "guest-123",
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
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        invite_code: "ABCD-1234",
        is_plus_one: false,
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
    mockExecute.mockResolvedValue([]);

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
    mockExecute.mockClear();
  });

  it("should accept code from query parameter", async () => {
    mockExecute.mockResolvedValue([
      {
        id: "guest-123",
        first_name: "John",
        invite_code: "DEEP-LINK",
        is_plus_one: false,
        rsvp_status: "pending",
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
    expect(data.guests[0].invite_code).toBe("DEEP-LINK");
  });
});
