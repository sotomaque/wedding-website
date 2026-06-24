import { describe, expect, it } from "bun:test";
import { type CalendarEvent, generateIcs } from "@/lib/calendar/generate-ics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    name: "Ceremony",
    event_date: new Date("2026-07-30T00:00:00.000Z"),
    start_time: "15:00",
    end_time: "17:00",
    location_name: "The Venue",
    location_address: "123 Main St, San Diego, CA",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateIcs
// ---------------------------------------------------------------------------

describe("generateIcs", () => {
  it("returns a VCALENDAR wrapped string", () => {
    const ics = generateIcs([makeEvent()], "Helen");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("includes one VEVENT per event", () => {
    const ics = generateIcs(
      [makeEvent(), makeEvent({ id: "event-2", name: "Reception" })],
      "Helen",
    );
    const beginCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(beginCount).toBe(2);
  });

  it("skips events with null event_date", () => {
    const ics = generateIcs([makeEvent({ event_date: null })], "Helen");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("formats DTSTART correctly for a timed event", () => {
    const ics = generateIcs(
      [makeEvent({ start_time: "15:00", end_time: "17:00" })],
      "Helen",
    );
    expect(ics).toContain("DTSTART;TZID=America/New_York:20260730T150000");
    expect(ics).toContain("DTEND;TZID=America/New_York:20260730T170000");
  });

  it("uses VALUE=DATE for all-day events (no start_time)", () => {
    const ics = generateIcs(
      [makeEvent({ start_time: null, end_time: null })],
      "Helen",
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20260730");
    expect(ics).toContain("DTEND;VALUE=DATE:20260730");
  });

  it("defaults end_time to start + 2 hours when end_time is null", () => {
    const ics = generateIcs(
      [makeEvent({ start_time: "15:00", end_time: null })],
      "Helen",
    );
    expect(ics).toContain("DTEND;TZID=America/New_York:20260730T170000");
  });

  it("wraps around midnight when start_time + 2h crosses midnight", () => {
    const ics = generateIcs(
      [makeEvent({ start_time: "23:00", end_time: null })],
      "Helen",
    );
    expect(ics).toContain("DTEND;TZID=America/New_York:20260730T010000");
  });

  it("includes SUMMARY with event name and couple names", () => {
    const ics = generateIcs(
      [makeEvent({ name: "Ceremony" })],
      "Helen",
      "Alice & Bob",
    );
    expect(ics).toContain("SUMMARY:Ceremony — Alice & Bob");
  });

  it("uses 'the couple' as default when coupleName not provided", () => {
    const ics = generateIcs([makeEvent({ name: "Ceremony" })], "Helen");
    expect(ics).toContain("SUMMARY:Ceremony — the couple");
  });

  it("includes LOCATION when location_address is present", () => {
    const ics = generateIcs([makeEvent()], "Helen");
    expect(ics).toContain("LOCATION:123 Main St\\, San Diego\\, CA");
  });

  it("falls back to location_name when location_address is null", () => {
    const ics = generateIcs([makeEvent({ location_address: null })], "Helen");
    expect(ics).toContain("LOCATION:The Venue");
  });

  it("omits LOCATION line when both location fields are null", () => {
    const ics = generateIcs(
      [makeEvent({ location_name: null, location_address: null })],
      "Helen",
    );
    expect(ics).not.toContain("LOCATION:");
  });

  it("includes the UID with the event id", () => {
    const ics = generateIcs([makeEvent({ id: "abc-123" })], "Helen");
    expect(ics).toContain("UID:abc-123@");
  });

  it("escapes commas and semicolons in text fields", () => {
    const ics = generateIcs(
      [makeEvent({ name: "Ceremony; Reception, Party" })],
      "Helen",
      "Alice & Bob",
    );
    expect(ics).toContain(
      "SUMMARY:Ceremony\\; Reception\\, Party — Alice & Bob",
    );
  });

  it("uses CRLF line endings throughout", () => {
    const ics = generateIcs([makeEvent()], "Helen");
    // Every line break should be CRLF
    const lines = ics.split("\r\n");
    expect(lines.length).toBeGreaterThan(5);
    // No bare LF-only newlines after splitting on CRLF
    for (const line of lines) {
      expect(line).not.toContain("\n");
    }
  });

  it("accepts a Date object for event_date (not just a string)", () => {
    const dateObj = new Date("2026-07-30T00:00:00.000Z");
    const ics = generateIcs([makeEvent({ event_date: dateObj })], "Helen");
    expect(ics).toContain("DTSTART;TZID=America/New_York:20260730T150000");
  });

  it("returns empty VCALENDAR with no VEVENT when events array is empty", () => {
    const ics = generateIcs([], "Helen");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("emits DTSTART/DTEND with the provided timezone", () => {
    const ics = generateIcs(
      [makeEvent({ start_time: "16:00", end_time: "18:00" })],
      "Helen",
      "Alice & Bob",
      "America/Los_Angeles",
    );
    expect(ics).toContain("DTSTART;TZID=America/Los_Angeles:20260730T160000");
    expect(ics).toContain("DTEND;TZID=America/Los_Angeles:20260730T180000");
  });

  it("does not leak a hardcoded couple name into PRODID", () => {
    const ics = generateIcs([makeEvent()], "Helen", "Alice & Bob");
    expect(ics).toContain("PRODID:-//The Ceremony//Wedding//EN");
    expect(ics).not.toContain("Helen & Enrique");
  });

  it("emits a UTC DTSTAMP (trailing Z)", () => {
    const ics = generateIcs([makeEvent()], "Helen");
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });
});
