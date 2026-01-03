import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

/**
 * GET /api/admin/events
 * Fetch all events with invite counts (admin only)
 */
export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

        if (event.is_default) {
          // For default events, use guest's main RSVP status
          const guests = await db
            .selectFrom("guests")
            .select("rsvp_status")
            .execute();

          total = guests.length;
          confirmed = guests.filter((g) => g.rsvp_status === "yes").length;
          declined = guests.filter((g) => g.rsvp_status === "no").length;
        } else {
          const invites = await db
            .selectFrom("guest_event_invites")
            .select("rsvp_status")
            .where("event_id", "=", event.id)
            .execute();

          total = invites.length;
          confirmed = invites.filter((i) => i.rsvp_status === "yes").length;
          declined = invites.filter((i) => i.rsvp_status === "no").length;
        }

        return {
          ...event,
          inviteCount: total,
          confirmedCount: confirmed,
          declinedCount: declined,
        };
      }),
    );

    return NextResponse.json({ events: eventsWithCounts });
  } catch (error) {
    console.error("Error in GET /api/admin/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/events
 * Create a new event (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      eventDate,
      startTime,
      endTime,
      locationName,
      locationAddress,
      latitude,
      longitude,
      isDefault,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get the highest display_order
    const maxOrder = await db
      .selectFrom("events")
      .select(db.fn.max("display_order").as("max_order"))
      .executeTakeFirst();

    const newOrder = (maxOrder?.max_order ?? 0) + 1;

    const event = await db
      .insertInto("events")
      .values({
        name,
        description: description || null,
        event_date: eventDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        location_name: locationName || null,
        location_address: locationAddress || null,
        latitude: latitude || null,
        longitude: longitude || null,
        is_default: isDefault || false,
        display_order: newOrder,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // If this is a default event, invite all guests
    if (isDefault) {
      const guests = await db.selectFrom("guests").select("id").execute();

      for (const guest of guests) {
        await db
          .insertInto("guest_event_invites")
          .values({
            guest_id: guest.id,
            event_id: event.id,
          })
          .onConflict((oc) => oc.columns(["guest_id", "event_id"]).doNothing())
          .execute();
      }
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
