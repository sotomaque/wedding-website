"use client";

import { CalendarDayButton } from "@workspace/ui/components/calendar";
import { cn } from "@workspace/ui/lib/utils";
import { type ComponentPropsWithoutRef, createContext, use } from "react";
import { toDateKey } from "@/app/[slug]/admin/calendar/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STAY_COLORS = [
  "bg-violet-200 text-violet-900 dark:bg-violet-800 dark:text-violet-100",
  "bg-pink-200 text-pink-900 dark:bg-pink-800 dark:text-pink-100",
  "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100",
  "bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100",
  "bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100",
  "bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100",
  "bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100",
  "bg-teal-200 text-teal-900 dark:bg-teal-800 dark:text-teal-100",
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function normalizeKey(raw: string): string {
  return raw.slice(0, 10);
}

export function formatDateHeading(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// DotContext — passes dot date sets to DayButtonWithDots without re-mounting
// ---------------------------------------------------------------------------

export interface DotContextValue {
  eventDates: Set<string>;
  arrivalDates: Set<string>;
  departureDates: Set<string>;
  activityDates: Set<string>;
}

export const DotContext = createContext<DotContextValue>({
  eventDates: new Set(),
  arrivalDates: new Set(),
  departureDates: new Set(),
  activityDates: new Set(),
});

export function DayButtonWithDots({
  day,
  modifiers,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof CalendarDayButton>) {
  const { eventDates, arrivalDates, departureDates, activityDates } =
    use(DotContext);
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

export const CALENDAR_COMPONENTS = { DayButton: DayButtonWithDots };

// ---------------------------------------------------------------------------
// ToggleButton
// ---------------------------------------------------------------------------

export function ToggleButton({
  active,
  onToggle,
  color,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  color: "blue" | "green" | "orange" | "purple" | "cyan";
  label: string;
}) {
  const dotColor = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
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

// ---------------------------------------------------------------------------
// PartyRow / GuestRow — detail panel rows
// ---------------------------------------------------------------------------

import type { PartyTravel } from "@/app/[slug]/admin/calendar/utils";

export function PartyRow({
  party,
  transport,
}: {
  party: PartyTravel;
  transport: string | null;
}) {
  const name = `${party.firstName} ${party.lastName ?? ""}`.trim();
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
            .map((m) => `${m.firstName} ${m.lastName ?? ""}`.trim())
            .join(", ")}
        </div>
      )}
    </div>
  );
}

export function GuestRow({
  name,
  transport,
}: {
  name: string;
  transport: string | null;
}) {
  return (
    <div className="rounded-md border px-3 py-2 text-sm flex items-center justify-between">
      <span>{name}</span>
      {transport && (
        <span className="text-xs text-muted-foreground">{transport}</span>
      )}
    </div>
  );
}
