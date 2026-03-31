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
export function formatEventTime(
  startTime: Date | string | null | undefined,
  endTime?: Date | string | null | undefined,
): string {
  if (!startTime) return "";

  function to12Hour(time: Date | string): string {
    const str = time instanceof Date ? time.toISOString() : String(time);
    const [hours, minutes] = str.split(":");
    const hour = Number.parseInt(hours || "0", 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  let result = to12Hour(startTime);
  if (endTime) {
    result += ` - ${to12Hour(endTime)}`;
  }
  return result;
}
