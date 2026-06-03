import { describe, expect, it } from "bun:test";
import { summarizeRsvpStatusGroups } from "@/lib/db/admin/rsvp-stats";

describe("summarizeRsvpStatusGroups", () => {
  it("maps yes/no to attending/declined and sums the total", () => {
    expect(
      summarizeRsvpStatusGroups([
        { rsvpStatus: "yes", _count: 10 },
        { rsvpStatus: "no", _count: 3 },
        { rsvpStatus: "pending", _count: 7 },
      ]),
    ).toEqual({ totalGuests: 20, attending: 10, declined: 3, pending: 7 });
  });

  it("counts null/unknown statuses as pending", () => {
    expect(
      summarizeRsvpStatusGroups([
        { rsvpStatus: null, _count: 4 },
        { rsvpStatus: "yes", _count: 1 },
      ]),
    ).toEqual({ totalGuests: 5, attending: 1, declined: 0, pending: 4 });
  });

  it("returns all-zero for no groups", () => {
    expect(summarizeRsvpStatusGroups([])).toEqual({
      totalGuests: 0,
      attending: 0,
      declined: 0,
      pending: 0,
    });
  });
});
