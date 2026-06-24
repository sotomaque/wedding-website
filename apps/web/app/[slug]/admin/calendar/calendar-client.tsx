"use client";

import { Calendar } from "@workspace/ui/components/calendar";
import { cn } from "@workspace/ui/lib/utils";
import { useMemo, useState } from "react";
import {
  CALENDAR_COMPONENTS,
  DotContext,
  formatDateHeading,
  GuestRow,
  normalizeKey,
  PartyRow,
  STAY_COLORS,
  ToggleButton,
} from "@/components/calendar/shared";
import {
  type ActivityPlan,
  type GuestTravel,
  getStayBars,
  getWeeksInMonth,
  type PartyTravel,
  type TravelEntry,
  toDateKey,
} from "./utils";

// Types for data passed from server
interface CalendarEvent {
  id: string;
  name: string;
  eventDate: string | null; // serialized Date → "YYYY-MM-DD"
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
}

interface CalendarClientProps {
  events: CalendarEvent[];
  guests: GuestTravel[];
  parties: PartyTravel[];
  activityPlans: ActivityPlan[];
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function StayOverview({
  month,
  guests,
  colorMap,
}: {
  month: Date;
  guests: TravelEntry[];
  colorMap: Map<string, string>;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const weeks = getWeeksInMonth(year, monthIndex);

  const guestsWithBothDates = guests.filter(
    (g) => g.arrivalDate && g.departureDate,
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
          const firstDay = week[0];
          if (!firstDay) return null;
          const weekKey = toDateKey(firstDay);
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
                      title={`${bar.guest.firstName} ${bar.guest.lastName ?? ""}`.trim()}
                    >
                      {bar.isStart && (
                        <span className="truncate">
                          {bar.guest.firstName} {bar.guest.lastName ?? ""}
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
            {g.firstName} {g.lastName ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Format a serialized event time (an ISO string like 1970-01-01T18:00:00.000Z
 * for a @db.Time column) as a 12-hour clock time. Formatted in UTC because the
 * time was stored/serialized as a UTC wall-clock value.
 */
function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export function CalendarClient({
  events,
  guests,
  parties,
  activityPlans,
}: CalendarClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [month, setMonth] = useState<Date>(() => new Date());
  const [showEvents, setShowEvents] = useState(true);
  const [showArrivals, setShowArrivals] = useState(true);
  const [showDepartures, setShowDepartures] = useState(true);
  const [showStays, setShowStays] = useState(true);
  const [showActivities, setShowActivities] = useState(true);
  const [sideFilter, setSideFilter] = useState<"all" | "bride" | "groom">(
    "all",
  );
  const [groupMode, setGroupMode] = useState<"guests" | "parties">("guests");

  // Pick individual guests or collapsed parties based on toggle
  const baseList: TravelEntry[] = groupMode === "parties" ? parties : guests;

  // Stable color assignment keyed to unfiltered list — prevents color shift on filter change
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    baseList.forEach((g, i) => {
      map.set(g.id, STAY_COLORS[i % STAY_COLORS.length] as string);
    });
    return map;
  }, [baseList]);

  // Apply side filter
  const filteredGuests = useMemo(
    () =>
      sideFilter === "all"
        ? baseList
        : baseList.filter((g) => g.side === sideFilter),
    [baseList, sideFilter],
  );

  // Compute sets of "YYYY-MM-DD" keys per layer
  const eventDates = useMemo(() => {
    const set = new Set<string>();
    if (!showEvents) return set;
    for (const e of events) {
      if (e.eventDate) set.add(normalizeKey(e.eventDate));
    }
    return set;
  }, [events, showEvents]);

  const arrivalDates = useMemo(() => {
    const set = new Set<string>();
    if (!showArrivals) return set;
    for (const g of filteredGuests) {
      if (g.arrivalDate) set.add(normalizeKey(g.arrivalDate));
    }
    return set;
  }, [filteredGuests, showArrivals]);

  const departureDates = useMemo(() => {
    const set = new Set<string>();
    if (!showDepartures) return set;
    for (const g of filteredGuests) {
      if (g.departureDate) set.add(normalizeKey(g.departureDate));
    }
    return set;
  }, [filteredGuests, showDepartures]);

  // Filter activity plans by side when a side filter is active
  const filteredActivityPlans = useMemo(
    () =>
      sideFilter === "all"
        ? activityPlans
        : activityPlans.filter((ap) => ap.side === sideFilter),
    [activityPlans, sideFilter],
  );

  const activityDates = useMemo(() => {
    const set = new Set<string>();
    if (!showActivities) return set;
    for (const ap of filteredActivityPlans) {
      set.add(ap.plannedDate);
    }
    return set;
  }, [filteredActivityPlans, showActivities]);

  // Selected day detail data
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

  const dayEvents = useMemo(
    () =>
      selectedKey && showEvents
        ? events.filter(
            (e) => e.eventDate && normalizeKey(e.eventDate) === selectedKey,
          )
        : [],
    [selectedKey, events, showEvents],
  );

  const dayArrivals = useMemo(
    () =>
      selectedKey && showArrivals
        ? filteredGuests.filter(
            (g) => g.arrivalDate && normalizeKey(g.arrivalDate) === selectedKey,
          )
        : [],
    [selectedKey, filteredGuests, showArrivals],
  );

  const dayDepartures = useMemo(
    () =>
      selectedKey && showDepartures
        ? filteredGuests.filter(
            (g) =>
              g.departureDate && normalizeKey(g.departureDate) === selectedKey,
          )
        : [],
    [selectedKey, filteredGuests, showDepartures],
  );

  // Group activity plans for the selected day by activity, deduplicating by pre-computed key
  const dayActivities = useMemo(() => {
    if (!selectedKey || !showActivities) return [];
    const plansForDay = filteredActivityPlans.filter(
      (ap) => ap.plannedDate === selectedKey,
    );
    const byActivity = new Map<
      string,
      {
        id: string;
        name: string;
        emoji: string | null;
        people: { name: string; status: "interested" | "committed" }[];
      }
    >();
    const seen = new Set<string>();
    for (const ap of plansForDay) {
      if (seen.has(ap.dedupeKey)) continue;
      seen.add(ap.dedupeKey);

      const entry = byActivity.get(ap.activityId) ?? {
        id: ap.activityId,
        name: ap.activityName,
        emoji: ap.activityEmoji,
        people: [],
      };
      entry.people.push({ name: ap.displayName, status: ap.status });
      byActivity.set(ap.activityId, entry);
    }
    return Array.from(byActivity.values());
  }, [selectedKey, filteredActivityPlans, showActivities]);

  const dotContextValue = useMemo(
    () => ({ eventDates, arrivalDates, departureDates, activityDates }),
    [eventDates, arrivalDates, departureDates, activityDates],
  );

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Side filter */}
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 p-0.5 text-sm">
          {(["all", "bride", "groom"] as const).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setSideFilter(val)}
              className={cn(
                "rounded-full px-3 py-1 transition-colors capitalize",
                sideFilter === val
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {val === "all"
                ? "All Guests"
                : val === "bride"
                  ? "Bride's Side"
                  : "Groom's Side"}
            </button>
          ))}
        </div>

        {/* Guests / Parties toggle */}
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 p-0.5 text-sm">
          {(["guests", "parties"] as const).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setGroupMode(val)}
              className={cn(
                "rounded-full px-3 py-1 transition-colors capitalize",
                groupMode === val
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {val === "guests" ? "Guests" : "Parties"}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* Layer Toggles */}
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
                            {(e.startTime || e.endTime) && (
                              <p className="text-muted-foreground text-xs mt-0.5">
                                {formatTime(e.startTime)}
                                {e.endTime ? ` – ${formatTime(e.endTime)}` : ""}
                              </p>
                            )}
                            {e.locationName && (
                              <p className="text-muted-foreground text-xs">
                                {e.locationName}
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
                        {dayArrivals.map((g) =>
                          g.kind === "party" && g.members.length > 1 ? (
                            <PartyRow
                              key={g.id}
                              party={g}
                              transport={g.arrivalTransport}
                            />
                          ) : (
                            <GuestRow
                              key={g.id}
                              name={`${g.firstName} ${g.lastName ?? ""}`.trim()}
                              transport={g.arrivalTransport}
                            />
                          ),
                        )}
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
                        {dayDepartures.map((g) =>
                          g.kind === "party" && g.members.length > 1 ? (
                            <PartyRow
                              key={g.id}
                              party={g}
                              transport={g.departureTransport}
                            />
                          ) : (
                            <GuestRow
                              key={g.id}
                              name={`${g.firstName} ${g.lastName ?? ""}`.trim()}
                              transport={g.departureTransport}
                            />
                          ),
                        )}
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
                            key={activity.id}
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
      {showStays && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">
            Stay Overview —{" "}
            {month.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <StayOverview
            month={month}
            guests={filteredGuests}
            colorMap={colorMap}
          />
        </div>
      )}
    </div>
  );
}
