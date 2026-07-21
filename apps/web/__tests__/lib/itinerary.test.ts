import { describe, expect, it } from "bun:test";
import {
  dayKey,
  dayLabel,
  formatTimeOfDay,
  formatTimeRange,
  groupEventsByDay,
  type ItineraryEvent,
  isFull,
  isRsvpable,
} from "@/lib/itinerary";

function ev(partial: Partial<ItineraryEvent>): ItineraryEvent {
  return {
    id: "e",
    name: "Event",
    description: null,
    eventDate: null,
    endDate: null,
    startTime: null,
    endTime: null,
    locationName: null,
    locationAddress: null,
    publicRsvpToken: "tok",
    publicRsvpEnabled: true,
    capacity: null,
    confirmedCount: 0,
    ...partial,
  };
}

// Prisma maps `@db.Date` / `@db.Time` to Dates at UTC.
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const t = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

describe("dayKey / dayLabel", () => {
  it("keys by UTC calendar day and labels it", () => {
    expect(dayKey(d("2026-07-26"))).toBe("2026-07-26");
    expect(dayLabel(d("2026-07-26"))).toBe("Sunday, July 26");
  });

  it("handles undated events", () => {
    expect(dayKey(null)).toBe("tbd");
    expect(dayLabel(null)).toBe("Date to be announced");
  });
});

describe("formatTimeOfDay / formatTimeRange", () => {
  it("formats 12-hour times from UTC", () => {
    expect(formatTimeOfDay(t("10:00"))).toBe("10:00 AM");
    expect(formatTimeOfDay(t("15:00"))).toBe("3:00 PM");
    expect(formatTimeOfDay(t("00:05"))).toBe("12:05 AM");
    expect(formatTimeOfDay(null)).toBeNull();
  });

  it("formats a range, a single time, or nothing", () => {
    expect(formatTimeRange(t("10:00"), t("15:00"))).toBe("10:00 AM – 3:00 PM");
    expect(formatTimeRange(t("19:00"), null)).toBe("7:00 PM");
    expect(formatTimeRange(null, null)).toBeNull();
  });
});

describe("isRsvpable / isFull", () => {
  it("is RSVP-able only with a live token", () => {
    expect(isRsvpable(ev({}))).toBe(true);
    expect(isRsvpable(ev({ publicRsvpToken: null }))).toBe(false);
    expect(isRsvpable(ev({ publicRsvpEnabled: false }))).toBe(false);
  });

  it("is full only when a cap is set and reached", () => {
    expect(isFull(ev({ capacity: null, confirmedCount: 99 }))).toBe(false);
    expect(isFull(ev({ capacity: 10, confirmedCount: 9 }))).toBe(false);
    expect(isFull(ev({ capacity: 10, confirmedCount: 10 }))).toBe(true);
  });
});

describe("groupEventsByDay", () => {
  it("groups by day, sorts chronologically, and keeps input order within a day", () => {
    const events = [
      ev({ id: "beach", eventDate: d("2026-07-26") }),
      ev({ id: "mass", eventDate: d("2026-07-26") }),
      ev({ id: "wedding", eventDate: d("2026-07-30") }),
    ];
    // Pass the later day first to prove it gets re-sorted.
    const days = groupEventsByDay([events[2], events[0], events[1]]);

    expect(days.map((x) => x.key)).toEqual(["2026-07-26", "2026-07-30"]);
    expect(days[0]?.events.map((e) => e.id)).toEqual(["beach", "mass"]);
    expect(days[0]?.label).toBe("Sunday, July 26");
    expect(days[1]?.events.map((e) => e.id)).toEqual(["wedding"]);
  });

  it("places undated events last under a TBD heading", () => {
    const days = groupEventsByDay([
      ev({ id: "tbd", eventDate: null }),
      ev({ id: "dated", eventDate: d("2026-07-30") }),
    ]);
    expect(days.map((x) => x.key)).toEqual(["2026-07-30", "tbd"]);
    expect(days[1]?.label).toBe("Date to be announced");
  });

  it("returns an empty list for no events", () => {
    expect(groupEventsByDay([])).toEqual([]);
  });
});
