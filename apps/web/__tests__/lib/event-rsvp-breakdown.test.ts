import { describe, expect, it } from "bun:test";
import { groupEventGuests } from "@/lib/db/admin/event-rsvp-breakdown";

function guest(id: string, name: string, selfRegistered = false) {
  return { id, name, selfRegistered, inviteCode: null };
}

describe("groupEventGuests", () => {
  it("splits guests into confirmed / declined / pending by status", () => {
    const result = groupEventGuests([
      { guest: guest("1", "A"), status: "yes" },
      { guest: guest("2", "B"), status: "no" },
      { guest: guest("3", "C"), status: "pending" },
      { guest: guest("4", "D"), status: null },
      { guest: guest("5", "E"), status: "yes" },
    ]);

    expect(result.confirmed.map((g) => g.id)).toEqual(["1", "5"]);
    expect(result.declined.map((g) => g.id)).toEqual(["2"]);
    // null + "pending" both fall under pending
    expect(result.pending.map((g) => g.id)).toEqual(["3", "4"]);
    expect(result.tally).toEqual({
      total: 5,
      confirmed: 2,
      declined: 1,
      pending: 2,
    });
  });

  it("computes response rate as responded / total, rounded", () => {
    // 1 yes + 1 no responded of 3 -> 67%
    const result = groupEventGuests([
      { guest: guest("1", "A"), status: "yes" },
      { guest: guest("2", "B"), status: "no" },
      { guest: guest("3", "C"), status: "pending" },
    ]);
    expect(result.responseRate).toBe(67);
  });

  it("returns 0% response rate for an empty event", () => {
    const result = groupEventGuests([]);
    expect(result.responseRate).toBe(0);
    expect(result.tally.total).toBe(0);
  });

  it("collects self-registered guests regardless of their status", () => {
    const result = groupEventGuests([
      { guest: guest("1", "A", true), status: "yes" },
      { guest: guest("2", "B"), status: "yes" },
      { guest: guest("3", "C", true), status: "pending" },
    ]);
    expect(result.selfRegistered.map((g) => g.id)).toEqual(["1", "3"]);
  });
});
