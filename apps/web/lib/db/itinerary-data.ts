/**
 * Data loader for the public itinerary page.
 *
 * Returns the wedding's public events (the schedule) enriched with the fields
 * the itinerary UI needs beyond the generic getEvents(): the public RSVP token
 * + enabled flag, end date for multi-day events, capacity, and the confirmed
 * attendee count for capacity display. Ordered by displayOrder.
 */

import { cache } from "react";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import type { ItineraryEvent } from "@/lib/itinerary";

export const getItineraryEvents = cache(async (): Promise<ItineraryEvent[]> => {
  const weddingId = await getWeddingId();

  const events = await db.event.findMany({
    where: { weddingId, isPublic: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      eventDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      locationName: true,
      locationAddress: true,
      publicRsvpToken: true,
      publicRsvpEnabled: true,
      capacity: true,
    },
  });

  if (events.length === 0) return [];

  // Confirmed ("yes") attendee counts per event, in one grouped query.
  const counts = await db.guestEventInvite.groupBy({
    by: ["eventId"],
    where: {
      weddingId,
      rsvpStatus: "yes",
      eventId: { in: events.map((e) => e.id) },
    },
    _count: { _all: true },
  });
  const confirmedByEvent = new Map(
    counts.map((c) => [c.eventId, c._count._all]),
  );

  return events.map((event) => ({
    ...event,
    confirmedCount: confirmedByEvent.get(event.id) ?? 0,
  }));
});
