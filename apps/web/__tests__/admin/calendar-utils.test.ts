import { describe, expect, it } from "bun:test";
import {
  type GuestTravel,
  getStayBars,
  getWeeksInMonth,
  groupByParty,
  parseLocalDate,
  toDateKey,
} from "@/app/admin/calendar/utils";

// ---------------------------------------------------------------------------
// parseLocalDate
// ---------------------------------------------------------------------------
describe("parseLocalDate", () => {
  it("returns the correct local date without timezone shift", () => {
    const d = parseLocalDate("2026-06-15");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // June = 5
    expect(d.getDate()).toBe(15);
  });

  it("handles the first of a month", () => {
    const d = parseLocalDate("2026-01-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it("handles the last day of a month", () => {
    const d = parseLocalDate("2026-12-31");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// toDateKey
// ---------------------------------------------------------------------------
describe("toDateKey", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const d = new Date(2026, 5, 5); // June 5
    expect(toDateKey(d)).toBe("2026-06-05");
  });

  it("zero-pads single-digit month and day", () => {
    const d = new Date(2026, 0, 9); // January 9
    expect(toDateKey(d)).toBe("2026-01-09");
  });

  it("round-trips with parseLocalDate", () => {
    const original = "2026-10-20";
    expect(toDateKey(parseLocalDate(original))).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// getWeeksInMonth
// ---------------------------------------------------------------------------
describe("getWeeksInMonth", () => {
  it("each week has exactly 7 days", () => {
    const weeks = getWeeksInMonth(2026, 5); // June 2026
    for (const week of weeks) {
      expect(week.length).toBe(7);
    }
  });

  it("first day of every week is Sunday", () => {
    const weeks = getWeeksInMonth(2026, 5);
    for (const week of weeks) {
      expect((week[0] as Date).getDay()).toBe(0);
    }
  });

  it("last day of every week is Saturday", () => {
    const weeks = getWeeksInMonth(2026, 5);
    for (const week of weeks) {
      expect((week[6] as Date).getDay()).toBe(6);
    }
  });

  it("covers the entire target month", () => {
    const weeks = getWeeksInMonth(2026, 5); // June 2026
    const allDays = weeks.flat();
    const daysInMonth = new Set(
      allDays.filter((d) => d.getMonth() === 5).map((d) => d.getDate()),
    );
    // June has 30 days
    expect(daysInMonth.size).toBe(30);
    for (let day = 1; day <= 30; day++) {
      expect(daysInMonth.has(day)).toBe(true);
    }
  });

  it("includes padding days from prev/next month", () => {
    // June 2026 starts on a Monday, so Sunday Jun 31 (May 31) is padding
    const weeks = getWeeksInMonth(2026, 5);
    const firstDay = weeks[0]?.[0] as Date;
    expect(firstDay.getDay()).toBe(0); // Sunday
    expect(firstDay.getMonth()).toBe(4); // May (padding from prev month)
  });

  it("February in a leap year has 29 days covered", () => {
    const weeks = getWeeksInMonth(2028, 1); // Feb 2028 (leap year)
    const allDays = weeks.flat();
    const daysInFeb = new Set(
      allDays.filter((d) => d.getMonth() === 1).map((d) => d.getDate()),
    );
    expect(daysInFeb.size).toBe(29);
  });

  it("February in a non-leap year has 28 days covered", () => {
    const weeks = getWeeksInMonth(2026, 1); // Feb 2026
    const allDays = weeks.flat();
    const daysInFeb = new Set(
      allDays.filter((d) => d.getMonth() === 1).map((d) => d.getDate()),
    );
    expect(daysInFeb.size).toBe(28);
  });
});

// ---------------------------------------------------------------------------
// getStayBars
// ---------------------------------------------------------------------------

function makeGuest(
  id: string,
  arrival: string | null,
  departure: string | null,
): GuestTravel {
  return {
    kind: "guest" as const,
    id,
    firstName: "Guest",
    lastName: id,
    side: null,
    arrivalDate: arrival,
    arrivalTransport: null,
    departureDate: departure,
    departureTransport: null,
  };
}

// June 2026: week of June 14–20 (Sun–Sat)
function juneWeek(): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(2026, 5, 14 + i));
}

describe("getStayBars", () => {
  it("returns empty array when no guests have both dates", () => {
    const week = juneWeek();
    const guests = [
      makeGuest("g1", "2026-06-15", null),
      makeGuest("g2", null, "2026-06-18"),
      makeGuest("g3", null, null),
    ];
    const bars = getStayBars(week, guests, new Map());
    expect(bars.length).toBe(0);
  });

  it("skips a stay that ends before the week starts", () => {
    const week = juneWeek(); // Jun 14–20
    const guests = [makeGuest("g1", "2026-06-10", "2026-06-13")];
    expect(getStayBars(week, guests, new Map()).length).toBe(0);
  });

  it("skips a stay that starts after the week ends", () => {
    const week = juneWeek(); // Jun 14–20
    const guests = [makeGuest("g1", "2026-06-21", "2026-06-25")];
    expect(getStayBars(week, guests, new Map()).length).toBe(0);
  });

  it("stay entirely within the week: isStart and isEnd both true", () => {
    const week = juneWeek(); // Jun 14 (Sun) – Jun 20 (Sat)
    const guests = [makeGuest("g1", "2026-06-15", "2026-06-18")]; // Mon–Thu
    const bars = getStayBars(week, guests, new Map());

    expect(bars.length).toBe(1);
    const bar = bars[0] as (typeof bars)[0];
    expect(bar.isStart).toBe(true);
    expect(bar.isEnd).toBe(true);
    expect(bar.colStart).toBe(2); // Monday = day 1, col 2
    expect(bar.colEnd).toBe(5); // Thursday = day 4, col 5
  });

  it("stay starts before the week: isStart is false, clamps to Sunday", () => {
    const week = juneWeek(); // Jun 14 (Sun) – Jun 20 (Sat)
    const guests = [makeGuest("g1", "2026-06-10", "2026-06-16")];
    const bars = getStayBars(week, guests, new Map());

    expect(bars.length).toBe(1);
    const bar = bars[0] as (typeof bars)[0];
    expect(bar.isStart).toBe(false);
    expect(bar.isEnd).toBe(true);
    expect(bar.colStart).toBe(1); // clamped to Sunday
    expect(bar.colEnd).toBe(3); // Tuesday = day 2, col 3
  });

  it("stay ends after the week: isEnd is false, clamps to Saturday", () => {
    const week = juneWeek(); // Jun 14 (Sun) – Jun 20 (Sat)
    const guests = [makeGuest("g1", "2026-06-17", "2026-06-25")];
    const bars = getStayBars(week, guests, new Map());

    expect(bars.length).toBe(1);
    const bar = bars[0] as (typeof bars)[0];
    expect(bar.isStart).toBe(true);
    expect(bar.isEnd).toBe(false);
    expect(bar.colStart).toBe(4); // Wednesday = day 3, col 4
    expect(bar.colEnd).toBe(7); // clamped to Saturday
  });

  it("stay spans the entire week: isStart and isEnd both false", () => {
    const week = juneWeek(); // Jun 14–20
    const guests = [makeGuest("g1", "2026-06-01", "2026-06-30")];
    const bars = getStayBars(week, guests, new Map());

    expect(bars.length).toBe(1);
    const bar = bars[0] as (typeof bars)[0];
    expect(bar.isStart).toBe(false);
    expect(bar.isEnd).toBe(false);
    expect(bar.colStart).toBe(1);
    expect(bar.colEnd).toBe(7);
  });

  it("assigns color from colorMap", () => {
    const week = juneWeek();
    const guests = [makeGuest("g1", "2026-06-15", "2026-06-17")];
    const colorMap = new Map([["g1", "bg-violet-200"]]);
    const bars = getStayBars(week, guests, colorMap);

    expect(bars[0]?.colorClass).toBe("bg-violet-200");
  });

  it("uses empty string for guests not in colorMap", () => {
    const week = juneWeek();
    const guests = [makeGuest("g1", "2026-06-15", "2026-06-17")];
    const bars = getStayBars(week, guests, new Map());

    expect(bars[0]?.colorClass).toBe("");
  });

  it("returns one bar per overlapping guest", () => {
    const week = juneWeek();
    const guests = [
      makeGuest("g1", "2026-06-15", "2026-06-17"),
      makeGuest("g2", "2026-06-18", "2026-06-20"),
      makeGuest("g3", "2026-06-01", "2026-06-13"), // ends before week — excluded
    ];
    const bars = getStayBars(week, guests, new Map());
    expect(bars.length).toBe(2);
    expect(bars.map((b) => b.guest.id)).toEqual(["g1", "g2"]);
  });

  it("stay on exactly the first day of the week", () => {
    const week = juneWeek(); // starts Sun Jun 14
    const guests = [makeGuest("g1", "2026-06-14", "2026-06-14")];
    const bars = getStayBars(week, guests, new Map());

    expect(bars.length).toBe(1);
    const bar = bars[0] as (typeof bars)[0];
    expect(bar.isStart).toBe(true);
    expect(bar.isEnd).toBe(true);
    expect(bar.colStart).toBe(1);
    expect(bar.colEnd).toBe(1);
  });

  it("stay on exactly the last day of the week", () => {
    const week = juneWeek(); // ends Sat Jun 20
    const guests = [makeGuest("g1", "2026-06-20", "2026-06-20")];
    const bars = getStayBars(week, guests, new Map());

    expect(bars.length).toBe(1);
    const bar = bars[0] as (typeof bars)[0];
    expect(bar.isStart).toBe(true);
    expect(bar.isEnd).toBe(true);
    expect(bar.colStart).toBe(7);
    expect(bar.colEnd).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// groupByParty
// ---------------------------------------------------------------------------

function makeGuestWithParty(
  id: string,
  arrival: string | null,
  departure: string | null,
  partyId: string | null = null,
  partyName: string | null = null,
) {
  return {
    id,
    firstName: `First-${id}`,
    lastName: `Last-${id}`,
    side: "bride" as const,
    arrivalDate: arrival,
    arrivalTransport: arrival ? "Flight" : null,
    departureDate: departure,
    departureTransport: departure ? "Car" : null,
    partyId: partyId,
    partyName: partyName,
  };
}

describe("groupByParty", () => {
  it("returns empty array for empty input", () => {
    expect(groupByParty([])).toEqual([]);
  });

  it("wraps ungrouped guests (no partyId) as single-member parties", () => {
    const guests = [makeGuestWithParty("g1", "2026-06-15", "2026-06-20")];
    const result = groupByParty(guests);

    expect(result.length).toBe(1);
    expect(result[0]?.kind).toBe("party");
    expect(result[0]?.id).toBe("g1");
    expect(result[0]?.firstName).toBe("First-g1");
    expect(result[0]?.lastName).toBe("Last-g1");
    expect(result[0]?.members.length).toBe(1);
  });

  it("groups guests with the same partyId into one entry", () => {
    const guests = [
      makeGuestWithParty("g1", "2026-06-15", "2026-06-18", "p1", "The Smiths"),
      makeGuestWithParty("g2", "2026-06-16", "2026-06-20", "p1", "The Smiths"),
    ];
    const result = groupByParty(guests);

    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("p1");
    expect(result[0]?.members.length).toBe(2);
  });

  it("uses earliest arrival and latest departure across party members", () => {
    const guests = [
      makeGuestWithParty("g1", "2026-06-15", "2026-06-18", "p1", "Party"),
      makeGuestWithParty("g2", "2026-06-13", "2026-06-20", "p1", "Party"),
      makeGuestWithParty("g3", "2026-06-16", "2026-06-17", "p1", "Party"),
    ];
    const result = groupByParty(guests);

    expect(result[0]?.arrivalDate).toBe("2026-06-13");
    expect(result[0]?.departureDate).toBe("2026-06-20");
  });

  it("uses partyName as display name when available", () => {
    const guests = [
      makeGuestWithParty(
        "g1",
        "2026-06-15",
        "2026-06-18",
        "p1",
        "The Johnsons",
      ),
    ];
    const result = groupByParty(guests);

    expect(result[0]?.firstName).toBe("The Johnsons");
  });

  it("joins first names with & when no partyName", () => {
    const guests = [
      makeGuestWithParty("g1", "2026-06-15", "2026-06-18", "p1", null),
      makeGuestWithParty("g2", "2026-06-16", "2026-06-20", "p1", null),
    ];
    const result = groupByParty(guests);

    expect(result[0]?.firstName).toBe("First-g1 & First-g2");
  });

  it("handles a mix of grouped and ungrouped guests", () => {
    const guests = [
      makeGuestWithParty("g1", "2026-06-15", "2026-06-18", "p1", "Party A"),
      makeGuestWithParty("g2", "2026-06-16", "2026-06-20", "p1", "Party A"),
      makeGuestWithParty("g3", "2026-06-17", "2026-06-19"), // no party
    ];
    const result = groupByParty(guests);

    expect(result.length).toBe(2);
    expect(result[0]?.id).toBe("p1");
    expect(result[0]?.members.length).toBe(2);
    expect(result[1]?.id).toBe("g3");
    expect(result[1]?.members.length).toBe(1);
  });

  it("handles members with null travel dates", () => {
    const guests = [
      makeGuestWithParty("g1", "2026-06-15", null, "p1", "Party"),
      makeGuestWithParty("g2", null, "2026-06-20", "p1", "Party"),
    ];
    const result = groupByParty(guests);

    expect(result[0]?.arrivalDate).toBe("2026-06-15");
    expect(result[0]?.departureDate).toBe("2026-06-20");
  });

  it("takes side from first member", () => {
    const guests = [
      makeGuestWithParty("g1", "2026-06-15", "2026-06-18", "p1", "Party"),
    ];
    const result = groupByParty(guests);

    expect(result[0]?.side).toBe("bride");
  });

  it("converts members to GuestTravel kind", () => {
    const guests = [
      makeGuestWithParty("g1", "2026-06-15", "2026-06-18", "p1", "Party"),
    ];
    const result = groupByParty(guests);

    expect(result[0]?.members[0]?.kind).toBe("guest");
  });
});
