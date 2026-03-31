import { describe, expect, it } from "bun:test";
import { formatEventDate, formatEventTime } from "@/lib/utils/event-format";

describe("formatEventDate", () => {
  it("formats a Date object to YYYY-MM-DD", () => {
    expect(formatEventDate(new Date("2026-07-30T00:00:00Z"))).toBe(
      "2026-07-30",
    );
  });

  it("formats a date string", () => {
    expect(formatEventDate("2026-12-25")).toBe("2026-12-25");
  });

  it("returns empty string for null", () => {
    expect(formatEventDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatEventDate(undefined)).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatEventDate("not-a-date")).toBe("");
  });
});

describe("formatEventTime", () => {
  it("formats a start time in 12-hour format", () => {
    expect(formatEventTime("15:30")).toBe("3:30 PM");
  });

  it("formats morning time", () => {
    expect(formatEventTime("09:00")).toBe("9:00 AM");
  });

  it("formats noon", () => {
    expect(formatEventTime("12:00")).toBe("12:00 PM");
  });

  it("formats midnight as 12 AM", () => {
    expect(formatEventTime("00:00")).toBe("12:00 AM");
  });

  it("formats a time range with end time", () => {
    expect(formatEventTime("15:00", "17:30")).toBe("3:00 PM - 5:30 PM");
  });

  it("returns empty string for null start time", () => {
    expect(formatEventTime(null)).toBe("");
  });

  it("returns empty string for undefined start time", () => {
    expect(formatEventTime(undefined)).toBe("");
  });

  it("ignores end time when start is null", () => {
    expect(formatEventTime(null, "17:00")).toBe("");
  });
});
