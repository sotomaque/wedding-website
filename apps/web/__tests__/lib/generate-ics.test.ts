import { describe, expect, it } from "bun:test";
import {
  buildCalendarEmailHtml,
  type CalendarEvent,
  generateIcs,
} from "@/lib/calendar/generate-ics";

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
});

// ---------------------------------------------------------------------------
// buildCalendarEmailHtml
// ---------------------------------------------------------------------------

describe("buildCalendarEmailHtml", () => {
  it("includes the guest's first name", () => {
    const html = buildCalendarEmailHtml([makeEvent()], "Helen");
    expect(html).toContain("Hi Helen");
  });

  it("includes the event name", () => {
    const html = buildCalendarEmailHtml(
      [makeEvent({ name: "Ceremony" })],
      "Helen",
    );
    expect(html).toContain("Ceremony");
  });

  it("formats the date as a human-readable string, not an ISO string", () => {
    const html = buildCalendarEmailHtml([makeEvent()], "Helen");
    // Must NOT contain the raw ISO format
    expect(html).not.toContain("2026-07-30T");
    // Must NOT contain "Invalid Date"
    expect(html).not.toContain("Invalid Date");
    // Should contain the year
    expect(html).toContain("2026");
  });

  it("formats start_time as 12-hour time (not raw HH:MM:SS)", () => {
    const html = buildCalendarEmailHtml(
      [makeEvent({ start_time: "15:00" })],
      "Helen",
    );
    expect(html).toContain("3:00 PM");
    expect(html).not.toContain("15:00:00");
    expect(html).not.toContain("15:00 PM");
  });

  it("formats end_time as 12-hour time", () => {
    const html = buildCalendarEmailHtml(
      [makeEvent({ start_time: "09:30", end_time: "11:00" })],
      "Helen",
    );
    expect(html).toContain("9:30 AM");
    expect(html).toContain("11:00 AM");
  });

  it("handles times with seconds component (HH:MM:SS from DB)", () => {
    const html = buildCalendarEmailHtml(
      [makeEvent({ start_time: "15:00:00", end_time: "17:00:00" })],
      "Helen",
    );
    expect(html).toContain("3:00 PM");
    expect(html).toContain("5:00 PM");
    expect(html).not.toContain(":00:00");
  });

  it("shows time range with em dash separator when both times present", () => {
    const html = buildCalendarEmailHtml(
      [makeEvent({ start_time: "15:00", end_time: "17:00" })],
      "Helen",
    );
    expect(html).toContain("3:00 PM – 5:00 PM");
  });

  it("shows no time when start_time is null", () => {
    const html = buildCalendarEmailHtml(
      [makeEvent({ start_time: null, end_time: null })],
      "Helen",
    );
    expect(html).not.toContain(" at ");
  });

  it("includes location_name when present", () => {
    const html = buildCalendarEmailHtml([makeEvent()], "Helen");
    expect(html).toContain("The Venue");
  });

  it("includes location_address when present", () => {
    const html = buildCalendarEmailHtml([makeEvent()], "Helen");
    expect(html).toContain("123 Main St, San Diego, CA");
  });

  it("omits location section when location_name is null", () => {
    const html = buildCalendarEmailHtml(
      [makeEvent({ location_name: null, location_address: null })],
      "Helen",
    );
    expect(html).not.toContain("<small>");
  });

  it("renders one list item per event", () => {
    const events = [
      makeEvent({ id: "e1", name: "Ceremony" }),
      makeEvent({ id: "e2", name: "Reception" }),
    ];
    const html = buildCalendarEmailHtml(events, "Helen");
    const liCount = (html.match(/<li>/g) ?? []).length;
    expect(liCount).toBe(2);
  });

  it("handles a Date object for event_date without showing Invalid Date", () => {
    const dateObj = new Date("2026-07-30T00:00:00.000Z");
    const html = buildCalendarEmailHtml(
      [makeEvent({ event_date: dateObj })],
      "Helen",
    );
    expect(html).not.toContain("Invalid Date");
    expect(html).toContain("2026");
  });

  it("returns an empty list when passed no events", () => {
    const html = buildCalendarEmailHtml([], "Helen");
    expect(html).toContain("Hi Helen");
    // <ul> tag should exist but no <li> items
    expect(html).not.toContain("<li>");
  });

  it("midnight edge: formats 00:00 as 12:00 AM", () => {
    const html = buildCalendarEmailHtml(
      [makeEvent({ start_time: "00:00" })],
      "Helen",
    );
    expect(html).toContain("12:00 AM");
  });

  it("noon edge: formats 12:00 as 12:00 PM", () => {
    const html = buildCalendarEmailHtml(
      [makeEvent({ start_time: "12:00" })],
      "Helen",
    );
    expect(html).toContain("12:00 PM");
  });
});
