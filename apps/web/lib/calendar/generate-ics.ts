export interface CalendarEvent {
  id: string;
  name: string;
  event_date: Date | null;
  start_time: string | null; // "HH:MM"
  end_time: string | null; // "HH:MM"
  location_name: string | null;
  location_address: string | null;
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
 */
export function generateIcs(
  events: CalendarEvent[],
  guestName: string,
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Helen & Enrique//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    if (!event.event_date) continue;

    const startTime = event.start_time;
    const endTime =
      event.end_time ?? (startTime ? addTwoHours(startTime) : null);
    const dtStart = formatIcsDateTime(event.event_date, startTime);
    const dtEnd = formatIcsDateTime(event.event_date, endTime);
    const summary = escapeIcsText(`${event.name} — Helen & Enrique`);
    const location = escapeIcsText(
      event.location_address ?? event.location_name ?? "",
    );
    const description = escapeIcsText(
      `You're invited to ${event.name} for Helen & Enrique's wedding!${guestName ? ` We can't wait to celebrate with you, ${guestName}.` : ""}`,
    );
    const uid = `${event.id}@helen-and-enrique.com`;
    const now = new Date();
    const dtstamp = formatIcsDateTime(
      now,
      `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`,
    );

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (startTime) {
      lines.push(`DTSTART;TZID=America/New_York:${dtStart}`);
      lines.push(`DTEND;TZID=America/New_York:${dtEnd}`);
    } else {
      // All-day event
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    }

    lines.push(`SUMMARY:${summary}`);
    if (location) lines.push(`LOCATION:${location}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
