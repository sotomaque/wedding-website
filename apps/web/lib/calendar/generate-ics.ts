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
 * Converts a "HH:MM" or "HH:MM:SS" string to "H:MM AM/PM".
 */
function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hours = h ?? 0;
  const minutes = m ?? 0;
  const period = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 || 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Safely converts an event_date value (Date object or date string) to a Date.
 */
function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Builds the HTML body for a calendar invite email.
 */
export function buildCalendarEmailHtml(
  events: CalendarEvent[],
  guestFirstName: string,
): string {
  const eventLines = events
    .map((e) => {
      const date = toDate(e.event_date as Date | string | null);
      const dateStr = date
        ? date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "";
      const timeStr = e.start_time
        ? ` at ${formatTime(e.start_time)}${e.end_time ? ` – ${formatTime(e.end_time)}` : ""}`
        : "";
      const locationStr = e.location_name
        ? `<br/><small>${e.location_name}${e.location_address ? `, ${e.location_address}` : ""}</small>`
        : "";
      return `<li><strong>${e.name}</strong> — ${dateStr}${timeStr}${locationStr}</li>`;
    })
    .join("");

  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2d2d2d;">
      <h2 style="font-weight: normal; color: #7c6a5e;">Your Calendar Invite 💕</h2>
      <p>Hi ${guestFirstName},</p>
      <p>We're so excited to celebrate with you! Please find attached a calendar invite for our wedding events.</p>
      <ul style="line-height: 2;">${eventLines}</ul>
      <p>Open the attached <strong>.ics file</strong> to add these events to your calendar.</p>
      <p>With love,<br/>Helen &amp; Enrique</p>
    </div>
  `.trim();
}

/**
 * Generates an iCalendar (.ics) string for the given events.
 * Produces one VEVENT per event, wrapped in a VCALENDAR.
 */
export function generateIcs(
  events: CalendarEvent[],
  guestName: string,
  coupleName?: string,
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
