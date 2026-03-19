import { describe, expect, it } from "bun:test";
import { toDateStr } from "@/lib/calendar/date-utils";

describe("toDateStr", () => {
  it("returns null for null input", () => {
    expect(toDateStr(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(toDateStr(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(toDateStr("")).toBeNull();
  });

  it("converts a Date object to YYYY-MM-DD", () => {
    const d = new Date(2026, 5, 15); // June 15, 2026
    expect(toDateStr(d)).toBe("2026-06-15");
  });

  it("zero-pads single-digit month and day for Date objects", () => {
    const d = new Date(2026, 0, 5); // January 5, 2026
    expect(toDateStr(d)).toBe("2026-01-05");
  });

  it("handles December 31 correctly", () => {
    const d = new Date(2026, 11, 31);
    expect(toDateStr(d)).toBe("2026-12-31");
  });

  it("passes through a YYYY-MM-DD string unchanged", () => {
    expect(toDateStr("2026-06-15")).toBe("2026-06-15");
  });

  it("truncates a datetime string to just the date", () => {
    expect(toDateStr("2026-06-15T12:30:00.000Z")).toBe("2026-06-15");
  });

  it("truncates longer strings to first 10 chars", () => {
    expect(toDateStr("2026-06-15 extra stuff")).toBe("2026-06-15");
  });
});
