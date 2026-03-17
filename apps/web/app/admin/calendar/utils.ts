export interface GuestTravel {
  id: string;
  first_name: string;
  last_name: string | null;
  side: string | null;
  arrival_date: string | null;
  arrival_transport: string | null;
  departure_date: string | null;
  departure_transport: string | null;
}

export interface StayBar {
  guest: GuestTravel;
  colorClass: string;
  colStart: number; // 1–7 (Sun=1, Sat=7)
  colEnd: number; // 1–7
  isStart: boolean; // arrival falls within this week
  isEnd: boolean; // departure falls within this week
}

/** Normalize a Date to a "YYYY-MM-DD" key */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Parse a "YYYY-MM-DD" string as a local date (no timezone shift) */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  return new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

/** Returns an array of weeks (Sun–Sat), padding to fill the grid */
export function getWeeksInMonth(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());

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

/** Build stay bars for a single week row */
export function getStayBars(
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

    if (departure < weekStart || arrival > weekEnd) continue;

    const isStart = arrival >= weekStart && arrival <= weekEnd;
    const isEnd = departure >= weekStart && departure <= weekEnd;

    const clampedStart = isStart ? arrival : weekStart;
    const clampedEnd = isEnd ? departure : weekEnd;

    bars.push({
      guest,
      colorClass: colorMap.get(guest.id) ?? "",
      colStart: clampedStart.getDay() + 1,
      colEnd: clampedEnd.getDay() + 1,
      isStart,
      isEnd,
    });
  }

  return bars;
}
