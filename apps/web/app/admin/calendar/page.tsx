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
    db.event.findMany({
      select: {
        id: true,
        name: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        locationName: true,
      },
      orderBy: { eventDate: "asc" },
    }),
    db.guest.findMany({
      where: {
        OR: [{ arrivalDate: { not: null } }, { departureDate: { not: null } }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        side: true,
        arrivalDate: true,
        arrivalTransport: true,
        departureDate: true,
        departureTransport: true,
        partyId: true,
        party: {
          select: { name: true },
        },
      },
    }),
    db.guestActivityInterest.findMany({
      where: { plannedDate: { not: null } },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            side: true,
            party: { select: { name: true } },
          },
        },
        activity: {
          select: { name: true, emoji: true },
        },
      },
    }),
  ]);

  const events = eventsRaw.map((e) => ({
    id: e.id,
    name: e.name,
    event_date: toDateStr(e.eventDate),
    start_time: e.startTime
      ? e.startTime instanceof Date
        ? e.startTime.toISOString()
        : String(e.startTime)
      : null,
    end_time: e.endTime
      ? e.endTime instanceof Date
        ? e.endTime.toISOString()
        : String(e.endTime)
      : null,
    location_name: e.locationName,
  }));

  // Normalize dates and build GuestTravel[] (no party fields serialized)
  const guests: GuestTravel[] = guestsRaw.map((g) => ({
    kind: "guest" as const,
    id: g.id,
    first_name: g.firstName,
    last_name: g.lastName,
    side: g.side,
    arrival_date: toDateStr(g.arrivalDate),
    arrival_transport: g.arrivalTransport,
    departure_date: toDateStr(g.departureDate),
    departure_transport: g.departureTransport,
  }));

  // Group by party server-side so party_id/party_name aren't serialized to the client
  const parties = groupByParty(
    guestsRaw.map((g) => ({
      id: g.id,
      first_name: g.firstName,
      last_name: g.lastName,
      side: g.side,
      arrival_date: toDateStr(g.arrivalDate),
      arrival_transport: g.arrivalTransport,
      departure_date: toDateStr(g.departureDate),
      departure_transport: g.departureTransport,
      party_id: g.partyId,
      party_name: g.party?.name ?? null,
    })),
  );

  const activityPlans: ActivityPlan[] = activityPlansRaw
    .filter((ap) => ap.status === "interested" || ap.status === "committed")
    .map((ap) => ({
      activityId: ap.activityId,
      activityName: ap.activity.name,
      activityEmoji: ap.activity.emoji,
      displayName:
        ap.guest.party?.name ??
        `${ap.guest.firstName} ${ap.guest.lastName ?? ""}`.trim(),
      dedupeKey: `${ap.inviteCode}:${ap.activityId}`,
      side: ap.guest.side,
      status: ap.status as "interested" | "committed",
      plannedDate: toDateStr(ap.plannedDate) ?? "",
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
