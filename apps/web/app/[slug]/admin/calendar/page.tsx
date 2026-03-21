import { Suspense } from "react";
import { toDateStr } from "@/lib/calendar/date-utils";
import { db } from "@/lib/db";
import { CalendarClient } from "./calendar-client";
import { type ActivityPlan, type GuestTravel, groupByParty } from "./utils";

export default function CalendarPage() {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-medium">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Wedding events and guest travel at a glance
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 rounded-lg border border-dashed text-muted-foreground text-sm">
            Loading calendar...
          </div>
        }
      >
        <CalendarData />
      </Suspense>
    </div>
  );
}

async function CalendarData() {
  const [eventsRaw, guestsRaw, activityPlansRaw] = await Promise.all([
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
      .leftJoin("parties", "parties.id", "guests.party_id")
      .select([
        "guests.id",
        "guests.first_name",
        "guests.last_name",
        "guests.side",
        "guests.arrival_date",
        "guests.arrival_transport",
        "guests.departure_date",
        "guests.departure_transport",
        "guests.party_id",
        "parties.name as party_name",
      ])
      .where((eb) =>
        eb.or([
          eb("guests.arrival_date", "is not", null),
          eb("guests.departure_date", "is not", null),
        ]),
      )
      .execute(),
    db
      .selectFrom("guest_activity_interests as gai")
      .innerJoin("guests as g", "g.id", "gai.guest_id")
      .innerJoin("activities as a", "a.id", "gai.activity_id")
      .leftJoin("parties as p", "p.id", "g.party_id")
      .select([
        "gai.activity_id",
        "a.name as activity_name",
        "a.emoji as activity_emoji",
        "g.first_name",
        "g.last_name",
        "g.side",
        "gai.invite_code",
        "p.name as party_name",
        "gai.status",
        "gai.planned_date",
      ])
      .where("gai.planned_date", "is not", null)
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

  // Normalize dates and build GuestTravel[] (no party fields serialized)
  const guests: GuestTravel[] = guestsRaw.map((g) => ({
    kind: "guest" as const,
    id: g.id,
    first_name: g.first_name,
    last_name: g.last_name,
    side: g.side,
    arrival_date: toDateStr(g.arrival_date),
    arrival_transport: g.arrival_transport,
    departure_date: toDateStr(g.departure_date),
    departure_transport: g.departure_transport,
  }));

  // Group by party server-side so party_id/party_name aren't serialized to the client
  const parties = groupByParty(
    guestsRaw.map((g) => ({
      id: g.id,
      first_name: g.first_name,
      last_name: g.last_name,
      side: g.side,
      arrival_date: toDateStr(g.arrival_date),
      arrival_transport: g.arrival_transport,
      departure_date: toDateStr(g.departure_date),
      departure_transport: g.departure_transport,
      party_id: g.party_id,
      party_name: g.party_name,
    })),
  );

  const activityPlans: ActivityPlan[] = activityPlansRaw.map((ap) => ({
    activityId: ap.activity_id,
    activityName: ap.activity_name,
    activityEmoji: ap.activity_emoji,
    displayName:
      ap.party_name ?? `${ap.first_name} ${ap.last_name ?? ""}`.trim(),
    dedupeKey: `${ap.invite_code}:${ap.activity_id}`,
    side: ap.side,
    status: ap.status,
    plannedDate: toDateStr(ap.planned_date) ?? "",
  }));

  return (
    <CalendarClient
      events={events}
      guests={guests}
      parties={parties}
      activityPlans={activityPlans}
    />
  );
}
