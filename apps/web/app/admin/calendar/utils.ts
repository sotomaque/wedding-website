export interface GuestTravel {
  kind: "guest";
  id: string;
  first_name: string;
  last_name: string | null;
  side: string | null;
  arrival_date: string | null;
  arrival_transport: string | null;
  departure_date: string | null;
  departure_transport: string | null;
}

/** A collapsed party view — merges travel windows for all guests in a party */
export interface PartyTravel extends Omit<GuestTravel, "kind"> {
  kind: "party";
  /** Individual guests in this party */
  members: GuestTravel[];
}

/** Either a single guest or a collapsed party */
export type TravelEntry = GuestTravel | PartyTravel;

export interface StayBar {
  guest: TravelEntry;
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
  guests: TravelEntry[],
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

/** Input type for groupByParty — includes party info from the DB join */
interface GuestWithParty {
  id: string;
  first_name: string;
  last_name: string | null;
  side: string | null;
  arrival_date: string | null;
  arrival_transport: string | null;
  departure_date: string | null;
  departure_transport: string | null;
  party_id: string | null;
  party_name: string | null;
}

/** Group guests by party, merging travel windows (earliest arrival, latest departure) */
export function groupByParty(guests: GuestWithParty[]): PartyTravel[] {
  const partyMap = new Map<
    string,
    { members: GuestWithParty[]; partyName: string | null }
  >();
  const ungrouped: GuestWithParty[] = [];

  for (const g of guests) {
    if (g.party_id) {
      const entry = partyMap.get(g.party_id) ?? {
        members: [],
        partyName: g.party_name,
      };
      entry.members.push(g);
      partyMap.set(g.party_id, entry);
    } else {
      ungrouped.push(g);
    }
  }

  const parties: PartyTravel[] = [];

  for (const [partyId, { members, partyName }] of partyMap) {
    let earliestArrival: string | null = null;
    let latestDeparture: string | null = null;
    let arrivalTransport: string | null = null;
    let departureTransport: string | null = null;
    const side = members[0]?.side ?? null;

    for (const m of members) {
      if (
        m.arrival_date &&
        (!earliestArrival || m.arrival_date < earliestArrival)
      ) {
        earliestArrival = m.arrival_date;
        arrivalTransport = m.arrival_transport;
      }
      if (
        m.departure_date &&
        (!latestDeparture || m.departure_date > latestDeparture)
      ) {
        latestDeparture = m.departure_date;
        departureTransport = m.departure_transport;
      }
    }

    const displayName =
      partyName ?? members.map((m) => m.first_name).join(" & ");

    parties.push({
      kind: "party",
      id: partyId,
      first_name: displayName,
      last_name: null,
      side,
      arrival_date: earliestArrival,
      arrival_transport: arrivalTransport,
      departure_date: latestDeparture,
      departure_transport: departureTransport,
      members: members.map((m) => toGuestTravel(m)),
    });
  }

  for (const g of ungrouped) {
    parties.push({
      kind: "party",
      id: g.id,
      first_name: g.first_name,
      last_name: g.last_name,
      side: g.side,
      arrival_date: g.arrival_date,
      arrival_transport: g.arrival_transport,
      departure_date: g.departure_date,
      departure_transport: g.departure_transport,
      members: [toGuestTravel(g)],
    });
  }

  return parties;
}

function toGuestTravel(g: GuestWithParty): GuestTravel {
  return {
    kind: "guest",
    id: g.id,
    first_name: g.first_name,
    last_name: g.last_name,
    side: g.side,
    arrival_date: g.arrival_date,
    arrival_transport: g.arrival_transport,
    departure_date: g.departure_date,
    departure_transport: g.departure_transport,
  };
}
