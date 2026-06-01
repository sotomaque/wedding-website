import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  emptyTally,
  tallyInviteGroups,
  tallyRsvpStatuses,
} from "@/lib/db/admin/rsvp-tally";
import { getWeddingId } from "@/lib/db/wedding-context";
import { EventsClient } from "./events-client";

export const dynamic = "force-dynamic";

async function getEvents() {
  const weddingId = await getWeddingId();

  const events = await db.event.findMany({
    where: { weddingId },
    orderBy: [{ displayOrder: "asc" }, { eventDate: "asc" }],
  });

  // Compute invite counts in two queries instead of one-per-event:
  //  - Default events (ceremony/reception) invite everyone, so they all share
  //    the same tally derived from each guest's main RSVP status — fetched once.
  //  - Non-default events are tallied from a single grouped invite query.
  const hasDefault = events.some((e) => e.isDefault);
  const nonDefaultIds = events.filter((e) => !e.isDefault).map((e) => e.id);

  const [defaultTally, inviteGroups] = await Promise.all([
    hasDefault
      ? db.guest
          .findMany({ where: { weddingId }, select: { rsvpStatus: true } })
          .then((guests) => tallyRsvpStatuses(guests.map((g) => g.rsvpStatus)))
      : Promise.resolve(emptyTally()),
    nonDefaultIds.length > 0
      ? db.guestEventInvite.groupBy({
          by: ["eventId", "rsvpStatus"],
          where: { weddingId, eventId: { in: nonDefaultIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const inviteTallies = tallyInviteGroups(inviteGroups);

  const eventsWithCounts = events.map((event) => {
    const tally = event.isDefault
      ? defaultTally
      : (inviteTallies.get(event.id) ?? emptyTally());
    const { total, confirmed, declined, pending } = tally;

    const eventDateStr =
      event.eventDate instanceof Date
        ? (event.eventDate.toISOString().split("T")[0] ?? "")
        : String(event.eventDate);
    const createdAtStr =
      event.createdAt instanceof Date
        ? event.createdAt.toISOString()
        : String(event.createdAt);

    const endDateStr = event.endDate
      ? event.endDate instanceof Date
        ? (event.endDate.toISOString().split("T")[0] ?? null)
        : String(event.endDate)
      : null;

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      eventDate: eventDateStr,
      endDate: endDateStr,
      startTime: event.startTime
        ? event.startTime instanceof Date
          ? event.startTime.toISOString()
          : String(event.startTime)
        : null,
      endTime: event.endTime
        ? event.endTime instanceof Date
          ? event.endTime.toISOString()
          : String(event.endTime)
        : null,
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      latitude: event.latitude ? Number(event.latitude) : null,
      longitude: event.longitude ? Number(event.longitude) : null,
      isDefault: event.isDefault ?? false,
      capacity: event.capacity ?? null,
      publicRsvpToken: event.publicRsvpToken ?? null,
      publicRsvpEnabled: event.publicRsvpEnabled ?? true,
      displayOrder: event.displayOrder ?? 0,
      createdAt: createdAtStr,
      inviteCount: total,
      confirmedCount: confirmed,
      declinedCount: declined,
      pendingCount: pending,
    };
  });

  return eventsWithCounts;
}

export default async function AdminEventsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const events = await getEvents();

  return <EventsClient initialEvents={events} />;
}
