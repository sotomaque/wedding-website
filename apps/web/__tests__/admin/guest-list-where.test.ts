import { describe, expect, it } from "bun:test";
import { buildGuestListWhere } from "@/lib/db/admin/guest-list-where";

const WID = "wedding-1";

describe("buildGuestListWhere", () => {
  it("scopes to the wedding with no filters", () => {
    expect(buildGuestListWhere(WID)).toEqual({ weddingId: WID });
  });

  it("applies a single rsvp status directly and multiple via `in`", () => {
    expect(buildGuestListWhere(WID, { rsvpStatus: "yes" }).rsvpStatus).toBe(
      "yes",
    );
    expect(
      buildGuestListWhere(WID, { rsvpStatus: "yes,no" }).rsvpStatus,
    ).toEqual({ in: ["yes", "no"] });
  });

  it("ignores unknown rsvp status values", () => {
    expect(
      buildGuestListWhere(WID, { rsvpStatus: "bogus" }).rsvpStatus,
    ).toBeUndefined();
    // mixed: only the valid one survives → single value
    expect(
      buildGuestListWhere(WID, { rsvpStatus: "yes,bogus" }).rsvpStatus,
    ).toBe("yes");
  });

  it("coerces the boolean-ish string flags", () => {
    expect(buildGuestListWhere(WID, { family: "true" }).family).toBe(true);
    expect(buildGuestListWhere(WID, { isPlusOne: "false" }).isPlusOne).toBe(
      false,
    );
    expect(
      buildGuestListWhere(WID, { threeAndUnder: "true" }).threeAndUnder,
    ).toBe(true);
    expect(
      buildGuestListWhere(WID, { selfRegistered: "true" }).selfRegistered,
    ).toBe(true);
    expect(
      buildGuestListWhere(WID, { selfRegistered: "false" }).selfRegistered,
    ).toBe(false);
    expect(buildGuestListWhere(WID, {}).selfRegistered).toBeUndefined();
  });

  it("maps emailStatus to numberOfResends", () => {
    expect(
      buildGuestListWhere(WID, { emailStatus: "not_sent" }).numberOfResends,
    ).toBe(0);
    expect(
      buildGuestListWhere(WID, { emailStatus: "sent" }).numberOfResends,
    ).toBe(1);
    expect(
      buildGuestListWhere(WID, { emailStatus: "resent" }).numberOfResends,
    ).toEqual({ gt: 1 });
  });

  it("handles the bridalParty 'any' shortcut and specific roles", () => {
    expect(
      buildGuestListWhere(WID, { bridalParty: "any" }).bridalPartyRole,
    ).toEqual({ not: null });
    expect(
      buildGuestListWhere(WID, { bridalParty: "best_man" }).bridalPartyRole,
    ).toBe("best_man");
  });

  it("matches a single event via `some` and multiple via AND", () => {
    expect(
      buildGuestListWhere(WID, { events: "e1" }).guestEventInvites,
    ).toEqual({ some: { eventId: "e1" } });

    const multi = buildGuestListWhere(WID, { events: "e1,e2" });
    expect(multi.AND).toEqual([
      { guestEventInvites: { some: { eventId: "e1" } } },
      { guestEventInvites: { some: { eventId: "e2" } } },
    ]);
  });

  it("combines several filters", () => {
    expect(
      buildGuestListWhere(WID, { side: "bride", list: "a", rsvpStatus: "yes" }),
    ).toEqual({ weddingId: WID, side: "bride", list: "a", rsvpStatus: "yes" });
  });
});
