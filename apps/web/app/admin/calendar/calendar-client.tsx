"use client";

import { Calendar, CalendarDayButton } from "@workspace/ui/components/calendar";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";

// Types for data passed from server
interface CalendarEvent {
  id: string;
  name: string;
  event_date: string | null; // serialized Date → "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
}

interface GuestTravel {
  id: string;
  first_name: string;
  last_name: string | null;
  arrival_date: string | null;
  arrival_transport: string | null;
  departure_date: string | null;
  departure_transport: string | null;
}

interface CalendarClientProps {
  events: CalendarEvent[];
  guests: GuestTravel[];
}

/** Normalize any date string to "YYYY-MM-DD" */
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeKey(raw: string): string {
  return raw.slice(0, 10);
}

function formatDateHeading(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Parse a "YYYY-MM-DD" string as a local date (no timezone shift) */
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  return new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

/** Returns an array of weeks, each week is an array of 7 Date objects (Sun–Sat) */
function getWeeksInMonth(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start grid from the Sunday on or before the 1st
  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());

  // End grid at the Saturday on or after the last day
  const end = new Date(lastDay);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks: Date[][] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const STAY_COLORS = [
  "bg-violet-200 text-violet-900 dark:bg-violet-800 dark:text-violet-100",
  "bg-pink-200 text-pink-900 dark:bg-pink-800 dark:text-pink-100",
  "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100",
  "bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100",
  "bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100",
  "bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100",
  "bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100",
  "bg-teal-200 text-teal-900 dark:bg-teal-800 dark:text-teal-100",
];

interface StayBar {
  guest: GuestTravel;
  colorClass: string;
  colStart: number; // 1–7 (Sun=1, Sat=7)
  colEnd: number; // 1–7
  isStart: boolean; // arrival falls within this week
  isEnd: boolean; // departure falls within this week
}

function getStayBars(
  week: Date[],
  guests: GuestTravel[],
  colorMap: Map<string, string>,
): StayBar[] {
  const bars: StayBar[] = [];
  const weekStart = week[0] as Date;
  const weekEnd = week[6] as Date;

  for (const guest of guests) {
    if (!guest.arrival_date || !guest.departure_date) continue;

    const arrival = parseLocalDate(guest.arrival_date);
    const departure = parseLocalDate(guest.departure_date);

    // Skip if the stay doesn't overlap this week at all
    if (departure < weekStart || arrival > weekEnd) continue;

    const isStart = arrival >= weekStart && arrival <= weekEnd;
    const isEnd = departure >= weekStart && departure <= weekEnd;

    // Clamp to week boundaries
    const clampedStart = isStart ? arrival : weekStart;
    const clampedEnd = isEnd ? departure : weekEnd;

    // colStart/colEnd are 1-indexed (Sunday = 1)
    const colStart = clampedStart.getDay() + 1;
    const colEnd = clampedEnd.getDay() + 1;

    bars.push({
      guest,
      colorClass: colorMap.get(guest.id) ?? (STAY_COLORS[0] as string),
      colStart,
      colEnd,
      isStart,
      isEnd,
    });
  }

  return bars;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function StayOverview({
  month,
  guests,
}: {
  month: Date;
  guests: GuestTravel[];
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const weeks = getWeeksInMonth(year, monthIndex);

  // Assign a stable color to each guest
  const colorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    guests.forEach((g, i) => {
      map.set(g.id, STAY_COLORS[i % STAY_COLORS.length] as string);
    });
    return map;
  }, [guests]);

  const guestsWithBothDates = guests.filter(
    (g) => g.arrival_date && g.departure_date,
  );

  if (guestsWithBothDates.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 rounded-lg border border-dashed text-muted-foreground text-sm">
        No guests with complete travel dates to display.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground">
        {DOW_LABELS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1">
        {weeks.map((week) => {
          const weekKey = toDateKey(week[0] as Date);
          const bars = getStayBars(week, guestsWithBothDates, colorMap);

          return (
            <div key={weekKey} className="relative">
              {/* Day numbers row */}
              <div className="grid grid-cols-7 gap-px mb-1">
                {week.map((day) => {
                  const inMonth = day.getMonth() === monthIndex;
                  return (
                    <div
                      key={toDateKey(day)}
                      className={cn(
                        "text-center text-xs py-0.5",
                        inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/40",
                      )}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>

              {/* Stay bars */}
              {bars.length > 0 && (
                <div className="grid grid-cols-7 gap-x-px space-y-0.5 pb-1">
                  {bars.map((bar, bi) => (
                    <div
                      key={`${bar.guest.id}-${weekKey}-${bi}`}
                      className={cn(
                        "h-5 flex items-center px-1.5 text-xs font-medium truncate",
                        bar.colorClass,
                        bar.isStart && bar.isEnd
                          ? "rounded-full"
                          : bar.isStart
                            ? "rounded-l-full"
                            : bar.isEnd
                              ? "rounded-r-full"
                              : "",
                      )}
                      style={{
                        gridColumn: `${bar.colStart} / ${bar.colEnd + 1}`,
                      }}
                      title={`${bar.guest.first_name} ${bar.guest.last_name ?? ""}`.trim()}
                    >
                      {bar.isStart && (
                        <span className="truncate">
                          {bar.guest.first_name} {bar.guest.last_name ?? ""}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        {guestsWithBothDates.map((g) => (
          <span
            key={g.id}
            className={cn(
              "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
              colorMap.get(g.id),
            )}
          >
            {g.first_name} {g.last_name ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CalendarClient({ events, guests }: CalendarClientProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [month, setMonth] = React.useState<Date>(() => new Date());
  const [showEvents, setShowEvents] = React.useState(true);
  const [showArrivals, setShowArrivals] = React.useState(true);
  const [showDepartures, setShowDepartures] = React.useState(true);
  const [showStays, setShowStays] = React.useState(true);

  // Compute sets of "YYYY-MM-DD" keys per layer
  const eventDates = React.useMemo(() => {
    const set = new Set<string>();
    if (!showEvents) return set;
    for (const e of events) {
      if (e.event_date) set.add(normalizeKey(e.event_date));
    }
    return set;
  }, [events, showEvents]);

  const arrivalDates = React.useMemo(() => {
    const set = new Set<string>();
    if (!showArrivals) return set;
    for (const g of guests) {
      if (g.arrival_date) set.add(normalizeKey(g.arrival_date));
    }
    return set;
  }, [guests, showArrivals]);

  const departureDates = React.useMemo(() => {
    const set = new Set<string>();
    if (!showDepartures) return set;
    for (const g of guests) {
      if (g.departure_date) set.add(normalizeKey(g.departure_date));
    }
    return set;
  }, [guests, showDepartures]);

  // Selected day detail data
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

  const dayEvents = React.useMemo(
    () =>
      selectedKey && showEvents
        ? events.filter(
            (e) => e.event_date && normalizeKey(e.event_date) === selectedKey,
          )
        : [],
    [selectedKey, events, showEvents],
  );

  const dayArrivals = React.useMemo(
    () =>
      selectedKey && showArrivals
        ? guests.filter(
            (g) =>
              g.arrival_date && normalizeKey(g.arrival_date) === selectedKey,
          )
        : [],
    [selectedKey, guests, showArrivals],
  );

  const dayDepartures = React.useMemo(
    () =>
      selectedKey && showDepartures
        ? guests.filter(
            (g) =>
              g.departure_date &&
              normalizeKey(g.departure_date) === selectedKey,
          )
        : [],
    [selectedKey, guests, showDepartures],
  );

  // Custom DayButton with colored dots
  const DayButtonWithDots = React.useCallback(
    function DotButton({
      day,
      modifiers,
      children,
      ...props
    }: React.ComponentPropsWithoutRef<typeof CalendarDayButton>) {
      const key = toDateKey(day.date);
      const hasEvent = eventDates.has(key);
      const hasArrival = arrivalDates.has(key);
      const hasDeparture = departureDates.has(key);
      const hasDots = hasEvent || hasArrival || hasDeparture;

      return (
        <CalendarDayButton day={day} modifiers={modifiers} {...props}>
          {children}
          {hasDots && (
            <div className="flex gap-0.5 justify-center">
              {hasEvent && <div className="h-1 w-1 rounded-full bg-blue-500" />}
              {hasArrival && (
                <div className="h-1 w-1 rounded-full bg-green-500" />
              )}
              {hasDeparture && (
                <div className="h-1 w-1 rounded-full bg-orange-500" />
              )}
            </div>
          )}
        </CalendarDayButton>
      );
    },
    [eventDates, arrivalDates, departureDates],
  );

  return (
    <div className="space-y-6">
      {/* Layer Toggles */}
      <div className="flex flex-wrap gap-3">
        <ToggleButton
          active={showEvents}
          onToggle={() => setShowEvents((v) => !v)}
          color="blue"
          label="Events"
        />
        <ToggleButton
          active={showArrivals}
          onToggle={() => setShowArrivals((v) => !v)}
          color="green"
          label="Arrivals"
        />
        <ToggleButton
          active={showDepartures}
          onToggle={() => setShowDepartures((v) => !v)}
          color="orange"
          label="Departures"
        />
        <ToggleButton
          active={showStays}
          onToggle={() => setShowStays((v) => !v)}
          color="purple"
          label="Stay Overview"
        />
      </div>

      {/* Calendar + Day Detail */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className="shrink-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={month}
            onMonthChange={setMonth}
            components={{ DayButton: DayButtonWithDots }}
            className="rounded-lg border p-4 bg-background"
          />
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
            {showEvents && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                Events
              </span>
            )}
            {showArrivals && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                Arrivals
              </span>
            )}
            {showDepartures && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
                Departures
              </span>
            )}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="flex-1 min-w-0">
          {selectedKey ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                {formatDateHeading(selectedKey)}
              </h2>

              {dayEvents.length === 0 &&
              dayArrivals.length === 0 &&
              dayDepartures.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled on this day.
                </p>
              ) : (
                <>
                  {dayEvents.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                        Events
                      </h3>
                      <div className="space-y-2">
                        {dayEvents.map((e) => (
                          <div
                            key={e.id}
                            className="rounded-md border p-3 text-sm"
                          >
                            <p className="font-medium">{e.name}</p>
                            {(e.start_time || e.end_time) && (
                              <p className="text-muted-foreground text-xs mt-0.5">
                                {e.start_time}
                                {e.end_time ? ` – ${e.end_time}` : ""}
                              </p>
                            )}
                            {e.location_name && (
                              <p className="text-muted-foreground text-xs">
                                {e.location_name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {dayArrivals.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                        Arriving ({dayArrivals.length})
                      </h3>
                      <div className="space-y-1">
                        {dayArrivals.map((g) => (
                          <div
                            key={g.id}
                            className="rounded-md border px-3 py-2 text-sm flex items-center justify-between"
                          >
                            <span>
                              {g.first_name} {g.last_name ?? ""}
                            </span>
                            {g.arrival_transport && (
                              <span className="text-xs text-muted-foreground">
                                {g.arrival_transport}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {dayDepartures.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
                        Departing ({dayDepartures.length})
                      </h3>
                      <div className="space-y-1">
                        {dayDepartures.map((g) => (
                          <div
                            key={g.id}
                            className="rounded-md border px-3 py-2 text-sm flex items-center justify-between"
                          >
                            <span>
                              {g.first_name} {g.last_name ?? ""}
                            </span>
                            {g.departure_transport && (
                              <span className="text-xs text-muted-foreground">
                                {g.departure_transport}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 rounded-lg border border-dashed text-muted-foreground text-sm">
              Click a day to see details
            </div>
          )}
        </div>
      </div>

      {/* Stay Overview */}
      {showStays && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">
            Stay Overview —{" "}
            {month.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <StayOverview month={month} guests={guests} />
        </div>
      )}
    </div>
  );
}

// Toggle button component
function ToggleButton({
  active,
  onToggle,
  color,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  color: "blue" | "green" | "orange" | "purple";
  label: string;
}) {
  const dotColor = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
  }[color];

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-border bg-background text-foreground"
          : "border-border bg-muted/50 text-muted-foreground line-through opacity-60",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dotColor)} />
      {label}
    </button>
  );
}
