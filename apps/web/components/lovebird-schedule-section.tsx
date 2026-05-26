import { Calendar, MapPin } from "lucide-react";

interface LovebirdScheduleEvent {
  id: string;
  name: string;
  description: string | null;
  eventDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  locationName: string | null;
  locationAddress: string | null;
}

interface LovebirdScheduleSectionProps {
  events: LovebirdScheduleEvent[];
}

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

function formatTimeOfDay(t: Date | null): string | null {
  if (!t) return null;
  // Prisma maps PG `time` to a Date with the time-of-day in UTC; pull the
  // hour/minute components off the ISO string to avoid TZ shifts.
  const iso = t.toISOString();
  const h = Number.parseInt(iso.slice(11, 13), 10);
  const m = iso.slice(14, 16);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Schedule section, Lovebird-style. Each event is a row with a stacked
 * date on the left (MMM / DD / YYYY) and an event panel on the right:
 *   - uppercase event name (tracked-out)
 *   - calendar line: long date + start—end time
 *   - venue name (bold serif)
 *   - description paragraph
 *   - pin line: address
 * Data comes from the `events` table (already used to surface
 * Ceremony / Reception elsewhere). Renders nothing if no events.
 */
export function LovebirdScheduleSection({
  events,
}: LovebirdScheduleSectionProps) {
  if (events.length === 0) return null;

  return (
    <section id="schedule" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          Schedule
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16" />

        <div className="space-y-16">
          {events.map((ev) => {
            const d = ev.eventDate ?? null;
            const month = d ? MONTH_SHORT[d.getMonth()] : null;
            const day = d ? d.getDate() : null;
            const year = d ? d.getFullYear() : null;
            const start = formatTimeOfDay(ev.startTime);
            const end = formatTimeOfDay(ev.endTime);
            const longDate = d ? formatLongDate(d) : null;

            return (
              <article
                key={ev.id}
                className="grid grid-cols-[auto_1fr] gap-x-8 md:gap-x-12 items-start"
              >
                {/* Stacked date */}
                <div className="text-center text-foreground/90 font-serif w-16 md:w-20 shrink-0">
                  {month && (
                    <p className="text-sm md:text-base uppercase tracking-[0.2em]">
                      {month}
                    </p>
                  )}
                  {day !== null && (
                    <p className="text-5xl md:text-6xl leading-none my-1">
                      {day}
                    </p>
                  )}
                  {year && (
                    <p className="text-sm md:text-base text-foreground/70">
                      {year}
                    </p>
                  )}
                </div>

                {/* Event details */}
                <div className="min-w-0">
                  <p className="text-base md:text-lg uppercase tracking-[0.3em] text-foreground mb-3">
                    {ev.name}
                  </p>

                  {longDate && (
                    <p className="flex items-center gap-2 text-foreground/80 mb-2 text-sm md:text-base">
                      <Calendar
                        aria-hidden="true"
                        className="size-4 opacity-70 shrink-0"
                        strokeWidth={1.5}
                      />
                      <span>
                        {longDate}
                        {start && (
                          <>
                            {" • "}
                            {start}
                            {end && ` — ${end}`}
                          </>
                        )}
                      </span>
                    </p>
                  )}

                  {ev.locationName && (
                    <p className="font-serif font-semibold text-foreground text-lg md:text-xl mb-2">
                      {ev.locationName}
                    </p>
                  )}

                  {ev.description && (
                    <p className="text-foreground/85 text-lg leading-relaxed mb-2">
                      {ev.description}
                    </p>
                  )}

                  {ev.locationAddress && (
                    <p className="flex items-center gap-2 text-foreground/75 text-sm">
                      <MapPin
                        aria-hidden="true"
                        className="size-4 opacity-70 shrink-0"
                        strokeWidth={1.5}
                      />
                      <span>{ev.locationAddress}</span>
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
