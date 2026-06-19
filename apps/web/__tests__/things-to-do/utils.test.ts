import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  formatDate,
  getSummaryText,
} from "@/app/[slug]/(public)/things-to-do/utils";

// Force US Pacific (behind UTC) so the date tests actually catch the off-by-one
// regression — plannedDate is a UTC-midnight `@db.Date`, and local formatting
// would render the previous day. CI runs in UTC and wouldn't catch it.
// Restore to a VALID zone afterwards (assigning undefined writes "undefined",
// which never resets and leaks into other files in bun's shared process).
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "America/Los_Angeles";
});
afterAll(() => {
  process.env.TZ = originalTz ?? "UTC";
});

describe("formatDate", () => {
  it("should format a date string to short format", () => {
    expect(formatDate("2026-07-30")).toBe("Jul 30");
  });

  it("should format dates with different months", () => {
    expect(formatDate("2026-01-15")).toBe("Jan 15");
    expect(formatDate("2026-12-25")).toBe("Dec 25");
    expect(formatDate("2026-03-01")).toBe("Mar 1");
  });

  it("should handle ISO date strings", () => {
    expect(formatDate("2026-07-30T16:00:00-07:00")).toBe("Jul 30");
  });
});

describe("getSummaryText", () => {
  it("should show only interested count when no one is committed", () => {
    const parties = [
      { status: "interested" as const },
      { status: "interested" as const },
    ];
    expect(getSummaryText(parties)).toBe("2 interested");
  });

  it("should show only going count when no one is interested", () => {
    const parties = [
      { status: "committed" as const },
      { status: "committed" as const },
      { status: "committed" as const },
    ];
    expect(getSummaryText(parties)).toBe("3 going");
  });

  it("should show both counts when there are both interested and committed", () => {
    const parties = [
      { status: "committed" as const },
      { status: "interested" as const },
      { status: "interested" as const },
    ];
    expect(getSummaryText(parties)).toBe("1 going, 2 interested");
  });

  it("should handle empty array", () => {
    expect(getSummaryText([])).toBe("0 interested");
  });

  it("should handle single interested party", () => {
    const parties = [{ status: "interested" as const }];
    expect(getSummaryText(parties)).toBe("1 interested");
  });

  it("should handle single committed party", () => {
    const parties = [{ status: "committed" as const }];
    expect(getSummaryText(parties)).toBe("1 going");
  });
});
