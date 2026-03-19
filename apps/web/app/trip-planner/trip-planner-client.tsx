"use client";

import { Calendar, CalendarDayButton } from "@workspace/ui/components/calendar";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";
import {
  type ActivityPlan,
  getStayBars,
  getWeeksInMonth,
  type PartyTravel,
  toDateKey,
} from "@/app/admin/calendar/utils";

interface CalendarEvent {
  id: string;
  name: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
}

interface TripPlannerClientProps {
  events: CalendarEvent[];
  parties: PartyTravel[];
  activityPlans: ActivityPlan[];
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

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Dot context for the calendar day buttons
interface DotContextValue {
  eventDates: Set<string>;
  arrivalDates: Set<string>;
  departureDates: Set<string>;
  activityDates: Set<string>;
}

const DotContext = React.createContext<DotContextValue>({
  eventDates: new Set(),
  arrivalDates: new Set(),
  departureDates: new Set(),
  activityDates: new Set(),
});

function DayButtonWithDots({
  day,
  modifiers,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof CalendarDayButton>) {
  const { eventDates, arrivalDates, departureDates, activityDates } =
    React.useContext(DotContext);
  const key = toDateKey(day.date);
  const hasEvent = eventDates.has(key);
  const hasArrival = arrivalDates.has(key);
  const hasDeparture = departureDates.has(key);
  const hasActivity = activityDates.has(key);
  const hasDots = hasEvent || hasArrival || hasDeparture || hasActivity;

  return (
    <CalendarDayButton day={day} modifiers={modifiers} {...props}>
      {children}
      {hasDots && (
        <div className="flex gap-0.5 justify-center">
          {hasEvent && <div className="h-1 w-1 rounded-full bg-blue-500" />}
          {hasArrival && <div className="h-1 w-1 rounded-full bg-green-500" />}
          {hasDeparture && (
            <div className="h-1 w-1 rounded-full bg-orange-500" />
          )}
          {hasActivity && <div className="h-1 w-1 rounded-full bg-cyan-500" />}
        </div>
      )}
    </CalendarDayButton>
  );
}

const CALENDAR_COMPONENTS = { DayButton: DayButtonWithDots };

export function TripPlannerClient({
  events,
  parties,
  activityPlans,
}: TripPlannerClientProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [month, setMonth] = React.useState<Date>(() => new Date());
  const [showEvents, setShowEvents] = React.useState(true);
  const [showStays, setShowStays] = React.useState(true);
  const [showActivities, setShowActivities] = React.useState(true);

  // Color map for stay bars
  const colorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    parties.forEach((p, i) => {
      map.set(p.id, STAY_COLORS[i % STAY_COLORS.length] as string);
    });
    return map;
  }, [parties]);

  // Dot date sets
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
    for (const p of parties) {
      if (p.arrival_date) set.add(normalizeKey(p.arrival_date));
    }
    return set;
  }, [parties]);

  const departureDates = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of parties) {
      if (p.departure_date) set.add(normalizeKey(p.departure_date));
    }
    return set;
  }, [parties]);

  const activityDates = React.useMemo(() => {
    const set = new Set<string>();
    if (!showActivities) return set;
    // Deduplicate by inviteCode + activityId
    const seen = new Set<string>();
    for (const ap of activityPlans) {
      const key = `${ap.inviteCode}:${ap.activityId}`;
      if (!seen.has(key)) {
        seen.add(key);
        set.add(ap.plannedDate);
      }
    }
    return set;
  }, [activityPlans, showActivities]);

  // Day detail data
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
      selectedKey
        ? parties.filter(
            (p) =>
              p.arrival_date && normalizeKey(p.arrival_date) === selectedKey,
          )
        : [],
    [selectedKey, parties],
  );

  const dayDepartures = React.useMemo(
    () =>
      selectedKey
        ? parties.filter(
            (p) =>
              p.departure_date &&
              normalizeKey(p.departure_date) === selectedKey,
          )
        : [],
    [selectedKey, parties],
  );

  const dayActivities = React.useMemo(() => {
    if (!selectedKey || !showActivities) return [];
    const plansForDay = activityPlans.filter(
      (ap) => ap.plannedDate === selectedKey,
    );
    const byActivity = new Map<
      string,
      {
        name: string;
        emoji: string | null;
        people: { name: string; status: "interested" | "committed" }[];
      }
    >();
    const seen = new Set<string>();
    for (const ap of plansForDay) {
      const dedupeKey = `${ap.inviteCode}:${ap.activityId}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const entry = byActivity.get(ap.activityId) ?? {
        name: ap.activityName,
        emoji: ap.activityEmoji,
        people: [],
      };
      const displayName =
        ap.partyName ?? `${ap.guestFirstName} ${ap.guestLastName ?? ""}`.trim();
      entry.people.push({ name: displayName, status: ap.status });
      byActivity.set(ap.activityId, entry);
    }
    return Array.from(byActivity.values());
  }, [selectedKey, activityPlans, showActivities]);

  const dotContextValue = React.useMemo(
    () => ({ eventDates, arrivalDates, departureDates, activityDates }),
    [eventDates, arrivalDates, departureDates, activityDates],
  );

  // Stay overview data
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const weeks = getWeeksInMonth(year, monthIndex);
  const partiesWithBothDates = parties.filter(
    (p) => p.arrival_date && p.departure_date,
  );

  return (
    <div className="space-y-6">
      {/* Toggle row */}
      <div className="flex flex-wrap items-center gap-3">
        <ToggleButton
          active={showEvents}
          onToggle={() => setShowEvents((v) => !v)}
          color="blue"
          label="Events"
        />
        <ToggleButton
          active={showActivities}
          onToggle={() => setShowActivities((v) => !v)}
          color="cyan"
          label="Activities"
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
          <DotContext.Provider value={dotContextValue}>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={month}
              onMonthChange={setMonth}
              components={CALENDAR_COMPONENTS}
              className="rounded-lg border p-4 bg-background"
            />
          </DotContext.Provider>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
            {showEvents && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                Events
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
              Arrivals
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
              Departures
            </span>
            {showActivities && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500 inline-block" />
                Activities
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
              dayDepartures.length === 0 &&
              dayActivities.length === 0 ? (
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
                        {dayArrivals.map((p) => (
                          <PartyRow
                            key={p.id}
                            party={p}
                            transport={p.arrival_transport}
                          />
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
                        {dayDepartures.map((p) => (
                          <PartyRow
                            key={p.id}
                            party={p}
                            transport={p.departure_transport}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {dayActivities.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-cyan-600 mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-500 inline-block" />
                        Activities ({dayActivities.length})
                      </h3>
                      <div className="space-y-2">
                        {dayActivities.map((activity) => (
                          <div
                            key={activity.name}
                            className="rounded-md border px-3 py-2 text-sm"
                          >
                            <p className="font-medium">
                              {activity.emoji && `${activity.emoji} `}
                              {activity.name}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {activity.people.map((p) => (
                                <span
                                  key={p.name}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                                    p.status === "committed"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                                  )}
                                >
                                  {p.name}
                                  <span className="text-[10px] opacity-70">
                                    {p.status === "committed"
                                      ? "going"
                                      : "interested"}
                                  </span>
                                </span>
                              ))}
                            </div>
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
      {showStays && partiesWithBothDates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">
            Stay Overview —{" "}
            {month.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
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
                const bars = getStayBars(week, partiesWithBothDates, colorMap);

                return (
                  <div key={weekKey} className="relative">
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
                                {bar.guest.first_name}{" "}
                                {bar.guest.last_name ?? ""}
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
              {partiesWithBothDates.map((p) => (
                <span
                  key={p.id}
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                    colorMap.get(p.id),
                  )}
                >
                  {p.first_name} {p.last_name ?? ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PartyRow({
  party,
  transport,
}: {
  party: PartyTravel;
  transport: string | null;
}) {
  const name = `${party.first_name} ${party.last_name ?? ""}`.trim();
  return (
    <div className="rounded-md border px-3 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{name}</span>
        {transport && (
          <span className="text-xs text-muted-foreground">{transport}</span>
        )}
      </div>
      {party.members.length > 1 && (
        <div className="mt-1 text-xs text-muted-foreground">
          {party.members
            .map((m) => `${m.first_name} ${m.last_name ?? ""}`.trim())
            .join(", ")}
        </div>
      )}
    </div>
  );
}

function ToggleButton({
  active,
  onToggle,
  color,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  color: "blue" | "cyan" | "purple";
  label: string;
}) {
  const dotColor = {
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
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
