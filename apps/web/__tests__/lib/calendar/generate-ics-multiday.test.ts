import { describe, expect, it } from "bun:test";
import { type CalendarEvent, generateIcs } from "@/lib/calendar/generate-ics";

const base: CalendarEvent = {
  id: "evt-1",
  name: "Camping Trip",
  event_date: new Date("2026-07-10T00:00:00Z"),
  end_date: null,
  start_time: null,
  end_time: null,
  location_name: null,
  location_address: null,
};

describe("generateIcs — multi-day events", () => {
  it("spans an all-day multi-day event with an exclusive DTEND (last day + 1)", () => {
    const ics = generateIcs(
      [{ ...base, end_date: new Date("2026-07-12T00:00:00Z") }],
      "Ada",
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20260710");
    // iCal all-day DTEND is exclusive → day after the last day (the 12th)
    expect(ics).toContain("DTEND;VALUE=DATE:20260713");
  });

  it("keeps a single-day all-day event's DTEND on the same day", () => {
    const ics = generateIcs([base], "Ada");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260710");
    expect(ics).toContain("DTEND;VALUE=DATE:20260710");
  });

  it("ends a timed multi-day event on the end date", () => {
    const ics = generateIcs(
      [
        {
          ...base,
          end_date: new Date("2026-07-12T00:00:00Z"),
          start_time: "16:00",
          end_time: "12:00",
        },
      ],
      "Ada",
    );
    expect(ics).toContain("DTSTART;TZID=America/New_York:20260710T160000");
    expect(ics).toContain("DTEND;TZID=America/New_York:20260712T120000");
  });
});
