import { describe, expect, it } from "bun:test";
import {
  emptyTally,
  tallyInviteGroups,
  tallyRsvpStatuses,
} from "@/lib/db/admin/rsvp-tally";

describe("tallyRsvpStatuses", () => {
  it("counts yes/no and treats everything else as pending", () => {
    expect(
      tallyRsvpStatuses(["yes", "yes", "no", "pending", null, undefined]),
    ).toEqual({ total: 6, confirmed: 2, declined: 1, pending: 3 });
  });

  it("returns an empty tally for no statuses", () => {
    expect(tallyRsvpStatuses([])).toEqual(emptyTally());
  });
});

describe("tallyInviteGroups", () => {
  it("folds grouped rows into a per-event tally map", () => {
    const map = tallyInviteGroups([
      { eventId: "e1", rsvpStatus: "yes", _count: { _all: 3 } },
      { eventId: "e1", rsvpStatus: "no", _count: { _all: 1 } },
      { eventId: "e1", rsvpStatus: "pending", _count: { _all: 2 } },
      { eventId: "e2", rsvpStatus: "yes", _count: { _all: 5 } },
    ]);

    expect(map.get("e1")).toEqual({
      total: 6,
      confirmed: 3,
      declined: 1,
      pending: 2,
    });
    expect(map.get("e2")).toEqual({
      total: 5,
      confirmed: 5,
      declined: 0,
      pending: 0,
    });
  });

  it("counts null rsvpStatus as pending", () => {
    const map = tallyInviteGroups([
      { eventId: "e1", rsvpStatus: null, _count: { _all: 4 } },
    ]);
    expect(map.get("e1")).toEqual({
      total: 4,
      confirmed: 0,
      declined: 0,
      pending: 4,
    });
  });

  it("returns an empty map for no groups", () => {
    expect(tallyInviteGroups([]).size).toBe(0);
  });
});
