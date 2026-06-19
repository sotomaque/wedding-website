import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { getScheduleDateParts } from "@/lib/format-schedule-date";

// Regression for the reported bug: an event set to Thursday, July 30 2026 showed
// as "Wednesday, July 29" on the public schedule for guests in timezones behind
// UTC. The cause was reading the UTC-midnight `@db.Date` value with LOCAL
// getters. These tests force US Pacific (where the bug reproduces) so they fail
// if anyone reverts to local getters — CI otherwise runs in UTC and wouldn't
// catch it. TZ is restored afterwards so it can't leak into other test files.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "America/Los_Angeles";
});
afterAll(() => {
  // Restore to a VALID zone — assigning `undefined` writes the string
  // "undefined" (an invalid TZ that never resets), leaking Pacific into other
  // test files in bun's shared process.
  process.env.TZ = originalTz ?? "UTC";
});

describe("getScheduleDateParts", () => {
  it("keeps the stored day in a timezone behind UTC (Jul 30, not Jul 29)", () => {
    // 2026-07-30 as Prisma returns a `@db.Date`: UTC midnight.
    const d = new Date("2026-07-30T00:00:00.000Z");
    const parts = getScheduleDateParts(d, "en-US");
    expect(parts.month).toBe("JUL");
    expect(parts.day).toBe(30);
    expect(parts.year).toBe(2026);
    expect(parts.longDate).toBe("Thursday, July 30");
  });

  it("handles a Jan 1 boundary without rolling into the prior year", () => {
    const d = new Date("2027-01-01T00:00:00.000Z");
    const parts = getScheduleDateParts(d, "en-US");
    expect(parts.month).toBe("JAN");
    expect(parts.day).toBe(1);
    expect(parts.year).toBe(2027);
    expect(parts.longDate).toBe("Friday, January 1");
  });

  it("returns all nulls when there is no date", () => {
    expect(getScheduleDateParts(null, "en-US")).toEqual({
      month: null,
      day: null,
      year: null,
      longDate: null,
    });
    expect(getScheduleDateParts(undefined, "en-US")).toEqual({
      month: null,
      day: null,
      year: null,
      longDate: null,
    });
  });

  it("localizes the long date", () => {
    const d = new Date("2026-07-30T00:00:00.000Z");
    // es-ES: weekday + month in Spanish, still the 30th in UTC.
    expect(getScheduleDateParts(d, "es-ES").longDate).toContain("30");
    expect(getScheduleDateParts(d, "es-ES").day).toBe(30);
  });
});
