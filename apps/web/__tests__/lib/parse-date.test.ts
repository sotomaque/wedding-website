import { describe, expect, it } from "bun:test";
import { parseDateOrNull } from "@/lib/utils/parse-date";

describe("parseDateOrNull", () => {
  it("widens a YYYY-MM-DD string to midnight UTC (the form-input case)", () => {
    const d = parseDateOrNull("2026-07-25");
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2026-07-25T00:00:00.000Z");
  });

  it("passes a Date through unchanged", () => {
    const input = new Date("2026-01-02T03:04:05.000Z");
    expect(parseDateOrNull(input)).toBe(input);
  });

  it("returns null for blanks", () => {
    expect(parseDateOrNull("")).toBeNull();
    expect(parseDateOrNull("   ")).toBeNull();
    expect(parseDateOrNull(null)).toBeNull();
    expect(parseDateOrNull(undefined)).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(parseDateOrNull("not-a-date")).toBeNull();
    expect(parseDateOrNull("2026-13-99")).toBeNull();
  });

  it("parses a full ISO datetime string", () => {
    const d = parseDateOrNull("2026-07-25T12:30:00.000Z");
    expect(d?.toISOString()).toBe("2026-07-25T12:30:00.000Z");
  });
});
