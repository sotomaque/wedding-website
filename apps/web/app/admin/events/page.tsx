import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { EventsClient } from "./events-client";

export const dynamic = "force-dynamic";

async function getEvents() {
  const events = await db.event.findMany({
    orderBy: [{ displayOrder: "asc" }, { eventDate: "asc" }],
  });

  // Get invite counts for each event
  const eventsWithCounts = await Promise.all(
    events.map(async (event) => {
      let total: number;
      let confirmed: number;
      let declined: number;
      let pending: number;

      if (event.isDefault) {
        // For default events (ceremony, reception), use the guest's main RSVP status
        // since all guests are automatically invited to these events
        const guests = await db.guest.findMany({
          select: { rsvpStatus: true },
        });

        total = guests.length;
        confirmed = guests.filter((g) => g.rsvpStatus === "yes").length;
        declined = guests.filter((g) => g.rsvpStatus === "no").length;
        pending = guests.filter((g) => g.rsvpStatus === "pending").length;
      } else {
        // For non-default events, use event-specific invites
        const invites = await db.guestEventInvite.findMany({
          where: { eventId: event.id },
          select: { rsvpStatus: true },
        });

        total = invites.length;
        confirmed = invites.filter((i) => i.rsvpStatus === "yes").length;
        declined = invites.filter((i) => i.rsvpStatus === "no").length;
        pending = invites.filter((i) => i.rsvpStatus === "pending").length;
      }

      const eventDateStr =
        event.eventDate instanceof Date
          ? (event.eventDate.toISOString().split("T")[0] ?? "")
          : String(event.eventDate);
      const createdAtStr =
        event.createdAt instanceof Date
          ? event.createdAt.toISOString()
          : String(event.createdAt);

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: eventDateStr,
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
        displayOrder: event.displayOrder ?? 0,
        createdAt: createdAtStr,
        inviteCount: total,
        confirmedCount: confirmed,
        declinedCount: declined,
        pendingCount: pending,
      };
    }),
  );

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
