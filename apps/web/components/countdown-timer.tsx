"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  /** Wedding date (ISO string preferred so it serializes from a server component). */
  targetDate: string;
  className?: string;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
}

function diff(target: Date): Remaining {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0 };
  const totalMinutes = Math.floor(ms / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

/**
 * Live countdown to the wedding date. Renders "117 Days  6 Hours  1 Mins"
 * — minute-resolution is enough for the hero card. Updates every 30s.
 *
 * On the server we render with zeros so the markup hydrates with stable
 * text; the client then ticks immediately on mount. Wrapping in
 * suppressHydrationWarning would also work but feels heavier than needed.
 */
export function CountdownTimer({ targetDate, className }: CountdownTimerProps) {
  const [r, setR] = useState<Remaining>({ days: 0, hours: 0, minutes: 0 });
  useEffect(() => {
    const target = new Date(targetDate);
    setR(diff(target));
    const id = setInterval(() => setR(diff(target)), 30_000);
    return () => clearInterval(id);
  }, [targetDate]);

  return (
    <p className={className}>
      <span className="text-2xl md:text-3xl tabular-nums">{r.days}</span>
      <span className="ml-1.5 text-sm tracking-wider uppercase">Days</span>
      <span className="mx-3 opacity-40">·</span>
      <span className="text-2xl md:text-3xl tabular-nums">{r.hours}</span>
      <span className="ml-1.5 text-sm tracking-wider uppercase">Hours</span>
      <span className="mx-3 opacity-40">·</span>
      <span className="text-2xl md:text-3xl tabular-nums">{r.minutes}</span>
      <span className="ml-1.5 text-sm tracking-wider uppercase">Mins</span>
    </p>
  );
}
