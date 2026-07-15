import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

// Superadmin auth via ADMIN_EMAILS so requireAdmin authorizes without the
// per-wedding lookup.
mock.module("@/env", () => ({
  env: { ADMIN_EMAILS: "admin@example.com" },
}));

const mockCurrentUser = mock(() =>
  Promise.resolve({
    id: "admin-1",
    primaryEmailAddressId: "email-primary",
    emailAddresses: [
      {
        id: "email-primary",
        emailAddress: "admin@example.com",
        verification: { status: "verified" },
      },
    ],
  }),
);
mock.module("@clerk/nextjs/server", () => ({ currentUser: mockCurrentUser }));

mock.module("@/lib/db/wedding-context", () => ({
  getWeddingId: mock(() => Promise.resolve("test-wedding-id")),
  getWeddingContext: mock(() =>
    Promise.resolve({ weddingId: "test-wedding-id", slug: "test-wedding" }),
  ),
}));

mock.module("@/lib/db/wedding-content-data", () => ({
  getWeddingSettings: mock(() =>
    Promise.resolve({
      slug: "test-wedding",
      coupleName: "Helen & Enrique",
      weddingDate: new Date("2026-07-30T00:00:00.000Z"),
      registryWishlistUrl: null,
      notificationEmails: "admin@example.com",
    }),
  ),
}));

mock.module("@/lib/email/helpers", () => ({
  getEmailFromAddress: () => "Helen & Enrique <rsvp@test.com>",
  getNotificationRecipients: () => ["admin@example.com"],
}));

const mockSendEmail = mock(() =>
  Promise.resolve({ data: { id: "e1" }, error: null }),
);
mock.module("@/lib/email/resend-client", () => ({
  sendEmail: mockSendEmail,
  getResendClient: () => ({}),
}));

const mockEventFindMany = mock(() => Promise.resolve([]) as Promise<unknown[]>);
const mockGuestFindMany = mock(() => Promise.resolve([]) as Promise<unknown[]>);
const mockEventFindFirst = mock(
  () => Promise.resolve(null) as Promise<unknown>,
);
const mockInviteFindMany = mock(
  () => Promise.resolve([]) as Promise<unknown[]>,
);

mock.module("@/lib/db", () => ({
  db: {
    event: { findMany: mockEventFindMany, findFirst: mockEventFindFirst },
    guest: { findMany: mockGuestFindMany },
    guestEventInvite: { findMany: mockInviteFindMany },
    weddingAdmin: { findFirst: mock(() => Promise.resolve(null)) },
  },
}));

const CONFIRMED = [
  { id: "g1", firstName: "Ada", lastName: "Lovelace", email: "ada@x.com" },
  { id: "g2", firstName: "Grace", lastName: "Hopper", email: "grace@x.com" },
];

function post(body: unknown) {
  return new NextRequest(
    "http://localhost/api/admin/guests/send-two-week-reminder",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("two-week reminder route — audience", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockEventFindMany.mockClear();
    mockGuestFindMany.mockClear();
    mockEventFindFirst.mockClear();
    mockInviteFindMany.mockClear();
    mockEventFindMany.mockResolvedValue([]);
    mockGuestFindMany.mockResolvedValue(CONFIRMED);
    mockEventFindFirst.mockResolvedValue(null);
    mockInviteFindMany.mockResolvedValue([]);
  });

  it("GET lists the all-confirmed audience", async () => {
    const { GET } = await import(
      "@/app/api/admin/guests/send-two-week-reminder/route"
    );
    const res = await GET(
      new NextRequest(
        "http://localhost/api/admin/guests/send-two-week-reminder",
      ),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      count: number;
      guests: { id: string; name: string; email: string }[];
    };
    expect(data.count).toBe(2);
    expect(data.guests[0]).toEqual({
      id: "g1",
      name: "Ada Lovelace",
      email: "ada@x.com",
    });
  });

  it("GET with an unknown eventId returns 404", async () => {
    const { GET } = await import(
      "@/app/api/admin/guests/send-two-week-reminder/route"
    );
    const res = await GET(
      new NextRequest(
        "http://localhost/api/admin/guests/send-two-week-reminder?eventId=00000000-0000-0000-0000-000000000000",
      ),
    );
    expect(res.status).toBe(404);
  });

  it("POST send emails the whole confirmed audience", async () => {
    const { POST } = await import(
      "@/app/api/admin/guests/send-two-week-reminder/route"
    );
    const res = await POST(post({ mode: "send" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { sent: number; total: number };
    expect(data.sent).toBe(2);
    expect(data.total).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("POST send with guestIds only emails the selected subset", async () => {
    const { POST } = await import(
      "@/app/api/admin/guests/send-two-week-reminder/route"
    );
    const res = await POST(post({ mode: "send", guestIds: ["g2"] }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { sent: number; total: number };
    expect(data.sent).toBe(1);
    expect(data.total).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const to = (mockSendEmail.mock.calls[0]?.[0] as { to: string }).to;
    expect(to).toBe("grace@x.com");
  });

  it("POST send targets a non-default event's confirmed invites", async () => {
    mockEventFindFirst.mockResolvedValue({ isDefault: false });
    mockInviteFindMany.mockResolvedValue([
      {
        guest: {
          id: "g9",
          firstName: "Pat",
          lastName: "Reception",
          email: "pat@x.com",
        },
      },
    ]);
    const { POST } = await import(
      "@/app/api/admin/guests/send-two-week-reminder/route"
    );
    const res = await POST(
      post({
        mode: "send",
        eventId: "11111111-1111-1111-1111-111111111111",
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { sent: number };
    expect(data.sent).toBe(1);
    expect(mockGuestFindMany).not.toHaveBeenCalled();
    const to = (mockSendEmail.mock.calls[0]?.[0] as { to: string }).to;
    expect(to).toBe("pat@x.com");
  });
});
