/**
 * Pure helpers for the public wedding-week itinerary.
 *
 * The itinerary is just the wedding's public Events, grouped by day and shown
 * with an inline "say you're going" RSVP. Everything here is DB-free so it can
 * be unit-tested; the data fetch lives in lib/db/itinerary-data.ts.
 */

export interface ItineraryEvent {
  id: string;
  name: string;
  description: string | null;
  /** Start day (Prisma `@db.Date` → Date at UTC midnight). */
  eventDate: Date | null;
  /** Last day for multi-day events (e.g. a two-day parks trip); else null. */
  endDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  locationName: string | null;
  locationAddress: string | null;
  /** Unguessable token for the public RSVP endpoint; null = not shareable. */
  publicRsvpToken: string | null;
  publicRsvpEnabled: boolean;
  capacity: number | null;
  /** Confirmed ("yes") attendees, for capacity display / full state. */
  confirmedCount: number;
}

export interface ItineraryDay {
  /** "YYYY-MM-DD" for dated events, or "tbd" for events with no date. */
  key: string;
  /** Human label, e.g. "Sunday, July 26" or "Date to be announced". */
  label: string;
  events: ItineraryEvent[];
}

const UTC_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** Stable grouping key for an event's start day (UTC), or "tbd" if undated. */
export function dayKey(date: Date | null): string {
  if (!date) return "tbd";
  return date.toISOString().slice(0, 10);
}

/** Friendly day heading, e.g. "Sunday, July 26". */
export function dayLabel(date: Date | null): string {
  if (!date) return "Date to be announced";
  return UTC_DATE.format(date);
}

/** Format a Prisma time-of-day (stored UTC) as "4:00 PM". */
export function formatTimeOfDay(time: Date | null): string | null {
  if (!time) return null;
  const hours = time.getUTCHours();
  const minutes = time.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

/** "4:00 PM – 6:00 PM", "4:00 PM", or null when no times are set. */
export function formatTimeRange(
  start: Date | null,
  end: Date | null,
): string | null {
  const s = formatTimeOfDay(start);
  const e = formatTimeOfDay(end);
  if (s && e) return `${s} – ${e}`;
  return s ?? null;
}

/** An event can take RSVPs only if it has a live public token. */
export function isRsvpable(event: {
  publicRsvpToken: string | null;
  publicRsvpEnabled: boolean;
}): boolean {
  return Boolean(event.publicRsvpToken) && event.publicRsvpEnabled;
}

/** True when a capped event has reached its confirmed-attendee limit. */
export function isFull(event: {
  capacity: number | null;
  confirmedCount: number;
}): boolean {
  return event.capacity != null && event.confirmedCount >= event.capacity;
}

/**
 * Group events into day sections, dated days first (chronological) and any
 * undated events last. Event order within a day is preserved (callers pass
 * events pre-sorted by displayOrder).
 */
export function groupEventsByDay(events: ItineraryEvent[]): ItineraryDay[] {
  const byKey = new Map<string, ItineraryEvent[]>();
  for (const event of events) {
    const key = dayKey(event.eventDate);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(event);
    else byKey.set(key, [event]);
  }

  return [...byKey.entries()]
    .sort(([a], [b]) => {
      // "tbd" always sorts last; otherwise plain ascending by ISO date key.
      if (a === "tbd") return 1;
      if (b === "tbd") return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    })
    .map(([key, dayEvents]) => ({
      key,
      label: dayLabel(dayEvents[0]?.eventDate ?? null),
      events: dayEvents,
    }));
}
