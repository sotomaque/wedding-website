import { db } from "@/lib/db";
import { CalendarClient } from "./calendar-client";

/** Convert any date value (Date object or "YYYY-MM-DD" string) to a "YYYY-MM-DD" string */
function toDateStr(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;
  }
  return String(val).slice(0, 10);
}

export default async function CalendarPage() {
  const [eventsRaw, guestsRaw] = await Promise.all([
    db
      .selectFrom("events")
      .select([
        "id",
        "name",
        "event_date",
        "start_time",
        "end_time",
        "location_name",
      ])
      .orderBy("event_date")
      .execute(),
    db
      .selectFrom("guests")
      .select([
        "id",
        "first_name",
        "last_name",
        "side",
        "arrival_date",
        "arrival_transport",
        "departure_date",
        "departure_transport",
      ])
      .where((eb) =>
        eb.or([
          eb("arrival_date", "is not", null),
          eb("departure_date", "is not", null),
        ]),
      )
      .execute(),
  ]);

  const events = eventsRaw.map((e) => ({
    id: e.id,
    name: e.name,
    event_date: toDateStr(e.event_date),
    start_time: e.start_time,
    end_time: e.end_time,
    location_name: e.location_name,
  }));

  const guests = guestsRaw.map((g) => ({
    id: g.id,
    first_name: g.first_name,
    last_name: g.last_name,
    side: g.side,
    arrival_date: toDateStr(g.arrival_date),
    arrival_transport: g.arrival_transport,
    departure_date: toDateStr(g.departure_date),
    departure_transport: g.departure_transport,
  }));

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-medium">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Wedding events and guest travel at a glance
        </p>
      </div>
      <CalendarClient events={events} guests={guests} />
    </div>
  );
}
