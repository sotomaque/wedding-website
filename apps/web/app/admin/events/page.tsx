import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { EventsClient } from "./events-client";

export const dynamic = "force-dynamic";

async function getEvents() {
  const events = await db
    .selectFrom("events")
    .selectAll()
    .orderBy("display_order", "asc")
    .orderBy("event_date", "asc")
    .execute();

  // Get invite counts for each event
  const eventsWithCounts = await Promise.all(
    events.map(async (event) => {
      let total: number;
      let confirmed: number;
      let declined: number;
      let pending: number;

      if (event.is_default) {
        // For default events (ceremony, reception), use the guest's main RSVP status
        // since all guests are automatically invited to these events
        const guests = await db
          .selectFrom("guests")
          .select("rsvp_status")
          .execute();

        total = guests.length;
        confirmed = guests.filter((g) => g.rsvp_status === "yes").length;
        declined = guests.filter((g) => g.rsvp_status === "no").length;
        pending = guests.filter((g) => g.rsvp_status === "pending").length;
      } else {
        // For non-default events, use event-specific invites
        const invites = await db
          .selectFrom("guest_event_invites")
          .select("rsvp_status")
          .where("event_id", "=", event.id)
          .execute();

        total = invites.length;
        confirmed = invites.filter((i) => i.rsvp_status === "yes").length;
        declined = invites.filter((i) => i.rsvp_status === "no").length;
        pending = invites.filter((i) => i.rsvp_status === "pending").length;
      }

      const eventDateStr =
        event.event_date instanceof Date
          ? (event.event_date.toISOString().split("T")[0] ?? "")
          : String(event.event_date);
      const createdAtStr =
        event.created_at instanceof Date
          ? event.created_at.toISOString()
          : String(event.created_at);

      return {
        ...event,
        event_date: eventDateStr,
        created_at: createdAtStr,
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
