import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGuestFindMany = mock(
  (_args?: unknown) => Promise.resolve([]) as Promise<unknown[]>,
);
const mockEventFindFirst = mock(
  (_args?: unknown) => Promise.resolve(null) as Promise<unknown>,
);
const mockInviteFindMany = mock(
  (_args?: unknown) => Promise.resolve([]) as Promise<unknown[]>,
);

mock.module("@/lib/db", () => ({
  db: {
    guest: { findMany: mockGuestFindMany },
    event: { findFirst: mockEventFindFirst },
    guestEventInvite: { findMany: mockInviteFindMany },
  },
}));

const { resolveReminderAudience } = await import(
  "@/lib/db/admin/reminder-audience"
);

const CONFIRMED = [
  { id: "g1", firstName: "Ada", lastName: "Lovelace", email: "ada@x.com" },
  { id: "g2", firstName: "Grace", lastName: null, email: "grace@x.com" },
  // Malformed email — filtered out even if the DB row slips through.
  { id: "g3", firstName: "No", lastName: "Mail", email: "not-an-email" },
];

describe("resolveReminderAudience", () => {
  beforeEach(() => {
    mockGuestFindMany.mockReset();
    mockEventFindFirst.mockReset();
    mockInviteFindMany.mockReset();
    mockGuestFindMany.mockResolvedValue(CONFIRMED);
  });

  it("scope=all returns confirmed guests with a usable email", async () => {
    const audience = await resolveReminderAudience("w1", { type: "all" });
    expect(audience?.map((g) => g.id)).toEqual(["g1", "g2"]);
    // queried the confirmed-with-email set
    expect(mockGuestFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: { weddingId: "w1", rsvpStatus: "yes", email: { not: null } },
    });
  });

  it("returns null when the event does not belong to the wedding", async () => {
    mockEventFindFirst.mockResolvedValue(null);
    const audience = await resolveReminderAudience("w1", {
      type: "event",
      eventId: "missing",
    });
    expect(audience).toBeNull();
  });

  it("a default event falls back to the all-confirmed audience", async () => {
    mockEventFindFirst.mockResolvedValue({ isDefault: true });
    const audience = await resolveReminderAudience("w1", {
      type: "event",
      eventId: "ceremony",
    });
    expect(audience?.map((g) => g.id)).toEqual(["g1", "g2"]);
    // used the guest table, not per-event invites
    expect(mockGuestFindMany).toHaveBeenCalledTimes(1);
    expect(mockInviteFindMany).not.toHaveBeenCalled();
  });

  it("a targeted event uses per-event confirmed invites", async () => {
    mockEventFindFirst.mockResolvedValue({ isDefault: false });
    mockInviteFindMany.mockResolvedValue([
      {
        guest: {
          id: "g5",
          firstName: "Pat",
          lastName: "Reception",
          email: "pat@x.com",
        },
      },
      // No usable email — dropped.
      { guest: { id: "g6", firstName: "Sam", lastName: null, email: null } },
    ]);

    const audience = await resolveReminderAudience("w1", {
      type: "event",
      eventId: "reception",
    });

    expect(audience?.map((g) => g.id)).toEqual(["g5"]);
    expect(mockInviteFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        eventId: "reception",
        weddingId: "w1",
        rsvpStatus: "yes",
        guest: { email: { not: null } },
      },
    });
    expect(mockGuestFindMany).not.toHaveBeenCalled();
  });
});
