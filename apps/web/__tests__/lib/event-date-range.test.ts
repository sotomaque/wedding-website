import { describe, expect, it } from "bun:test";
import { formatEventDateRange } from "@/lib/utils/event-format";

describe("formatEventDateRange", () => {
  it("returns a single date when there is no end date", () => {
    expect(formatEventDateRange("2026-07-30")).toBe("July 30, 2026");
  });

  it("treats an end date on/before the start as single-day", () => {
    expect(formatEventDateRange("2026-07-30", "2026-07-30")).toBe(
      "July 30, 2026",
    );
    expect(formatEventDateRange("2026-07-30", "2026-07-29")).toBe(
      "July 30, 2026",
    );
  });

  it("collapses a same-month range", () => {
    expect(formatEventDateRange("2026-07-10", "2026-07-12")).toBe(
      "July 10 – 12, 2026",
    );
  });

  it("shows both months for a same-year cross-month range", () => {
    expect(formatEventDateRange("2026-07-30", "2026-08-02")).toBe(
      "July 30 – August 2, 2026",
    );
  });

  it("shows full dates for a cross-year range", () => {
    expect(formatEventDateRange("2025-12-31", "2026-01-01")).toBe(
      "December 31, 2025 – January 1, 2026",
    );
  });

  it("accepts Date objects", () => {
    expect(
      formatEventDateRange(
        new Date("2026-07-10T00:00:00Z"),
        new Date("2026-07-12T00:00:00Z"),
      ),
    ).toBe("July 10 – 12, 2026");
  });

  it("returns empty string for no start", () => {
    expect(formatEventDateRange(null)).toBe("");
    expect(formatEventDateRange(undefined, "2026-07-12")).toBe("");
  });
});
