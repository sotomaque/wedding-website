import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock env
vi.mock("@/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
    RESEND_API_KEY: "test-key",
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

// Create db mock with tracking
const mockExecute = vi.fn().mockResolvedValue([]);
const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
const mockExecuteTakeFirstOrThrow = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateSet = vi.fn();
const mockDeleteWhere = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    selectFrom: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          execute: mockExecute,
        })),
        where: vi.fn(() => ({
          execute: mockExecute,
          executeTakeFirst: mockExecuteTakeFirst,
          where: vi.fn(() => ({
            executeTakeFirst: mockExecuteTakeFirst,
          })),
        })),
      })),
      select: vi.fn(() => ({
        where: vi.fn(() => ({
          executeTakeFirst: mockExecuteTakeFirst,
        })),
      })),
    })),
    insertInto: vi.fn(() => ({
      values: vi.fn((data) => {
        mockInsertValues(data);
        return {
          returningAll: vi.fn(() => ({
            executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
            executeTakeFirst: mockExecuteTakeFirst,
          })),
          execute: mockExecute,
        };
      }),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn((data) => {
        mockUpdateSet(data);
        return {
          where: vi.fn(() => ({
            execute: mockExecute,
            returningAll: vi.fn(() => ({
              executeTakeFirst: mockExecuteTakeFirst,
            })),
          })),
        };
      }),
    })),
    deleteFrom: vi.fn(() => ({
      where: vi.fn((field, op, value) => {
        mockDeleteWhere(field, op, value);
        return {
          execute: mockExecute,
          where: vi.fn(() => ({
            execute: mockExecute,
          })),
        };
      }),
    })),
  },
}));

// Mock email template
vi.mock("@/lib/email/templates/wedding-invitation", () => ({
  getWeddingInvitationEmail: vi.fn().mockReturnValue("<html>Mock email</html>"),
}));

describe("Guest CRUD - Create User", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "guest-123",
      first_name: "John",
      last_name: "Doe",
      invite_code: "ABCD-1234",
      plus_one_allowed: false,
    });
    mockExecuteTakeFirst.mockResolvedValue(null); // No existing invite code
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
    expect(mockInsertValues).toHaveBeenCalled();
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
    // First call for checking invite code uniqueness returns null (code is unique)
    // Then the executeTakeFirst for plus one insert returns the plus one guest
    mockExecuteTakeFirst
      .mockResolvedValueOnce(null) // No existing invite code
      .mockResolvedValueOnce({ id: "plus-one-123" }); // Plus one created

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
    // Primary guest should be created
    expect(mockInsertValues).toHaveBeenCalled();
    // First insert should have plusOneAllowed: true
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "John",
        plus_one_allowed: true,
      }),
    );
  });
});

describe("Guest CRUD - Edit User", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteTakeFirst.mockResolvedValue({
      id: "guest-123",
      first_name: "John",
      last_name: "Doe",
      invite_code: "ABCD-1234",
      plus_one_allowed: false,
      side: "bride",
      list: "a",
    });
  });

  it("should update guest details", async () => {
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
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Johnny",
        side: "groom",
        family: true,
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
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        list: "b",
      }),
    );
  });

  it("should add plus one when enabling plusOneAllowed", async () => {
    // First call returns current guest, second returns no existing plus one
    mockExecuteTakeFirst
      .mockResolvedValueOnce({
        id: "guest-123",
        first_name: "John",
        last_name: "Doe",
        invite_code: "ABCD-1234",
        plus_one_allowed: false,
        side: "bride",
        list: "a",
      })
      .mockResolvedValueOnce({
        id: "guest-123",
        first_name: "John",
        last_name: "Doe",
      })
      .mockResolvedValueOnce(null); // No existing plus one

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
    expect(mockInsertValues).toHaveBeenCalled();
  });

  it("should return 404 for non-existent guest", async () => {
    mockExecuteTakeFirst.mockResolvedValue(null);

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
    vi.clearAllMocks();
  });

  it("should delete a guest", async () => {
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
    expect(mockDeleteWhere).toHaveBeenCalledWith("id", "=", "guest-123");
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
    vi.clearAllMocks();
    mockExecuteTakeFirst.mockResolvedValue({
      id: "guest-123",
      first_name: "John",
      invite_code: "ABCD-1234",
      side: "bride",
      list: "a",
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
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ list: "a" }),
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
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ list: "b" }),
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
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ list: "c" }),
    );
  });
});
