/**
 * Display parts for a date-only event date (the events table's `event_date`,
 * a Prisma `@db.Date`).
 *
 * Prisma hands `@db.Date` columns back as a JS `Date` anchored at UTC midnight
 * (e.g. 2026-07-30 -> 2026-07-30T00:00:00.000Z). Reading that with LOCAL getters
 * (`getDate()`, `getMonth()`) or formatting it without `timeZone: "UTC"` shifts
 * it a day backwards for any viewer in a timezone behind UTC — e.g. a guest in
 * US Pacific saw "Thursday, July 30" turn into "Wednesday, July 29". Always read
 * these values in UTC.
 */

const MONTH_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export interface ScheduleDateParts {
  /** Short uppercase month, e.g. "JUL". */
  month: string | null;
  /** Day of month, 1-31. */
  day: number | null;
  /** Four-digit year. */
  year: number | null;
  /** Localized long date, e.g. "Thursday, July 30". */
  longDate: string | null;
}

/**
 * Break an event's date-only value into UTC-correct display parts. Returns all
 * nulls when there is no date. `locale` is a BCP-47 tag (e.g. "en-US").
 */
export function getScheduleDateParts(
  d: Date | null | undefined,
  locale: string,
): ScheduleDateParts {
  if (!d) return { month: null, day: null, year: null, longDate: null };
  return {
    month: MONTH_SHORT[d.getUTCMonth()] ?? null,
    day: d.getUTCDate(),
    year: d.getUTCFullYear(),
    longDate: d.toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }),
  };
}
