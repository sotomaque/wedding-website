/**
 * Shared formatting utilities for event dates and times in emails.
 */

/**
 * Format an event date as an ISO date string (YYYY-MM-DD).
 */
export function formatEventDate(
  eventDate: Date | string | null | undefined,
): string {
  if (!eventDate) return "";
  const d = eventDate instanceof Date ? eventDate : new Date(eventDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0] ?? "";
}

/**
 * Format event start/end times as a human-readable 12-hour string.
 * Returns e.g. "2:30 PM" or "2:30 PM - 4:30 PM".
 */
/** Normalize a Date or string to a "YYYY-MM-DD" key, or null if invalid. */
function toYmd(value: Date | string): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Friendly display of an event's date span. Single-day (no end, or end on/
 * before start) renders one date; multi-day collapses shared month/year, e.g.
 * "July 10 – 12, 2026", "July 30 – August 2, 2026", or
 * "December 31, 2025 – January 1, 2026".
 */
export function formatEventDateRange(
  start: Date | string | null | undefined,
  end?: Date | string | null | undefined,
  locale = "en-US",
): string {
  if (!start) return "";
  const s =
    start instanceof Date || typeof start === "string" ? toYmd(start) : null;
  if (!s) return "";
  const [sy = 0, sm = 1, sd = 1] = s.split("-").map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const full = { month: "long", day: "numeric", year: "numeric" } as const;

  const e = end ? toYmd(end) : null;
  if (!e || e <= s) {
    return startDate.toLocaleDateString(locale, full);
  }
  const [ey = 0, em = 1, ed = 1] = e.split("-").map(Number);
  const endDate = new Date(ey, em - 1, ed);

  if (sy === ey && sm === em) {
    const month = startDate.toLocaleDateString(locale, { month: "long" });
    return `${month} ${sd} – ${ed}, ${sy}`;
  }
  if (sy === ey) {
    const startStr = startDate.toLocaleDateString(locale, {
      month: "long",
      day: "numeric",
    });
    const endStr = endDate.toLocaleDateString(locale, {
      month: "long",
      day: "numeric",
    });
    return `${startStr} – ${endStr}, ${sy}`;
  }
  return `${startDate.toLocaleDateString(locale, full)} – ${endDate.toLocaleDateString(locale, full)}`;
}

export function formatEventTime(
  startTime: Date | string | null | undefined,
  endTime?: Date | string | null | undefined,
): string {
  if (!startTime) return "";

  function to12Hour(time: Date | string): string {
    // Prisma `@db.Time` columns come back as Date objects anchored to
    // 1970-01-01 (e.g. 1970-01-01T18:00:00.000Z). Pull the wall-clock "HH:MM"
    // out of the ISO string rather than splitting the whole timestamp — the
    // latter would parse the date portion ("1970-01-01T18") as the hour.
    const hhmm =
      time instanceof Date ? time.toISOString().slice(11, 16) : String(time);
    const [hours, minutes = "00"] = hhmm.split(":");
    const hour = Number.parseInt(hours || "0", 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes.slice(0, 2)} ${ampm}`;
  }

  let result = to12Hour(startTime);
  if (endTime) {
    result += ` - ${to12Hour(endTime)}`;
  }
  return result;
}
