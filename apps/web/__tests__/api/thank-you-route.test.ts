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

const mockGuestFindMany = mock(() => Promise.resolve([]) as Promise<unknown[]>);
mock.module("@/lib/db", () => ({
  db: {
    guest: { findMany: mockGuestFindMany },
    event: { findFirst: mock(() => Promise.resolve(null)) },
    guestEventInvite: { findMany: mock(() => Promise.resolve([])) },
    weddingAdmin: { findFirst: mock(() => Promise.resolve(null)) },
  },
}));

const CONFIRMED = [
  { id: "g1", firstName: "Ada", lastName: "Lovelace", email: "ada@x.com" },
  { id: "g2", firstName: "Grace", lastName: "Hopper", email: "grace@x.com" },
];

function post(body: unknown) {
  return new NextRequest("http://localhost/api/admin/guests/send-thank-you", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/guests/send-thank-you", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    mockGuestFindMany.mockClear();
    mockGuestFindMany.mockResolvedValue(CONFIRMED);
  });

  it("rejects an invalid mode", async () => {
    const { POST } = await import(
      "@/app/api/admin/guests/send-thank-you/route"
    );
    const res = await POST(post({ mode: "blast" }));
    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("preview sends one [Preview] copy to the notification recipients", async () => {
    const { POST } = await import(
      "@/app/api/admin/guests/send-thank-you/route"
    );
    const res = await POST(post({ mode: "preview" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const sent = mockSendEmail.mock.calls[0]?.[0] as {
      to: string[];
      subject: string;
      html: string;
      log: { type: string };
    };
    expect(sent.to).toEqual(["admin@example.com"]);
    expect(sent.subject).toStartWith("[Preview] ");
    expect(sent.log.type).toBe("thank_you_photos_preview");
    expect(sent.html).toContain("/test-wedding/photos/upload");
  });

  it("send emails every confirmed guest with a personal greeting", async () => {
    const { POST } = await import(
      "@/app/api/admin/guests/send-thank-you/route"
    );
    const res = await POST(post({ mode: "send" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { sent: number; total: number };
    expect(data.sent).toBe(2);
    expect(data.total).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    const first = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      html: string;
      log: { guestId: string; type: string };
    };
    expect(first.to).toBe("ada@x.com");
    expect(first.html).toContain("Hi Ada,");
    expect(first.log).toMatchObject({
      guestId: "g1",
      type: "thank_you_photos",
    });
  });

  it("counts per-guest failures without aborting the run", async () => {
    mockSendEmail
      .mockResolvedValueOnce({
        data: null,
        error: new Error("Send failed"),
      } as never)
      .mockResolvedValueOnce({ data: { id: "e2" }, error: null } as never);
    const { POST } = await import(
      "@/app/api/admin/guests/send-thank-you/route"
    );
    const res = await POST(post({ mode: "send" }));
    const data = (await res.json()) as { sent: number; failed: number };
    expect(data.sent).toBe(1);
    expect(data.failed).toBe(1);
  });
});
