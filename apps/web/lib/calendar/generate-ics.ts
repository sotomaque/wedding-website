export interface CalendarEvent {
  id: string;
  name: string;
  event_date: Date | null;
  end_date?: Date | null; // multi-day events end on this date
  start_time: string | null; // "HH:MM"
  end_time: string | null; // "HH:MM"
  location_name: string | null;
  location_address: string | null;
}

/** Add one UTC day (used for the exclusive DTEND of all-day spans). */
function addOneDayUtc(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Formats a Date + "HH:MM" time string into an iCalendar DTSTART/DTEND value.
 * Returns a floating local time (no TZID) formatted as YYYYMMDDTHHMMSS.
 */
function formatIcsDateTime(date: Date, time: string | null): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  if (!time) {
    return `${year}${month}${day}`;
  }

  const [hours, minutes] = time.split(":").map(Number);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes ?? 0).padStart(2, "0");
  return `${year}${month}${day}T${hh}${mm}00`;
}

/** UTC timestamp for DTSTAMP, formatted as YYYYMMDDTHHMMSSZ. */
function formatIcsUtcStamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hh}${mm}${ss}Z`;
}

/**
 * Adds two hours to a "HH:MM" time string.
 */
function addTwoHours(time: string): string {
  const parts = time.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const newHours = (hours + 2) % 24;
  return `${String(newHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Escapes special characters in iCalendar text values.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generates an iCalendar (.ics) string for the given events.
 * Produces one VEVENT per event, wrapped in a VCALENDAR.
 *
 * `timezone` is the wedding's IANA zone (e.g. "America/Los_Angeles"); timed
 * events are emitted with that TZID so guests see the correct local time
 * regardless of where the platform runs. Defaults to America/New_York for
 * backward compatibility.
 */
export function generateIcs(
  events: CalendarEvent[],
  guestName: string,
  coupleName?: string,
  timezone = "America/New_York",
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Ceremony//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    if (!event.event_date) continue;

    const startTime = event.start_time;
    const endTime =
      event.end_time ?? (startTime ? addTwoHours(startTime) : null);
    // Multi-day events end on end_date; the end time applies to that last day.
    const endDateBase = event.end_date ?? event.event_date;
    const isMultiDay =
      !!event.end_date &&
      endDateBase.toISOString().slice(0, 10) >
        event.event_date.toISOString().slice(0, 10);
    const dtStart = formatIcsDateTime(event.event_date, startTime);
    const dtEnd = formatIcsDateTime(endDateBase, endTime);
    const couple = coupleName ?? "the couple";
    const summary = escapeIcsText(`${event.name} — ${couple}`);
    const location = escapeIcsText(
      event.location_address ?? event.location_name ?? "",
    );
    const description = escapeIcsText(
      `You're invited to ${event.name} for ${couple}'s wedding!${guestName ? ` We can't wait to celebrate with you, ${guestName}.` : ""}`,
    );
    const domain =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ??
      "wedding-platform.com";
    const uid = `${event.id}@${domain}`;
    const dtstamp = formatIcsUtcStamp(new Date());

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (startTime) {
      lines.push(`DTSTART;TZID=${timezone}:${dtStart}`);
      lines.push(`DTEND;TZID=${timezone}:${dtEnd}`);
    } else {
      // All-day event. iCal DTEND is exclusive: for a multi-day span it's the
      // day after the last day; single-day keeps its prior same-day value.
      const allDayEnd = isMultiDay
        ? addOneDayUtc(endDateBase)
        : event.event_date;
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDateTime(allDayEnd, null)}`);
    }

    lines.push(`SUMMARY:${summary}`);
    if (location) lines.push(`LOCATION:${location}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
