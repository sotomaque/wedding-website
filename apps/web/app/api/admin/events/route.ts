import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

/**
 * List all events
 * @description Fetch all events with invite/RSVP counts (admin only)
 * @response 200:EventListResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
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

    const events = await db.event.findMany({
      orderBy: [{ displayOrder: "asc" }, { eventDate: "asc" }],
    });

    // Get invite counts for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        let total: number;
        let confirmed: number;
        let declined: number;

        if (event.isDefault) {
          // For default events, use guest's main RSVP status
          const guests = await db.guest.findMany({
            select: { rsvpStatus: true },
          });

          total = guests.length;
          confirmed = guests.filter((g) => g.rsvpStatus === "yes").length;
          declined = guests.filter((g) => g.rsvpStatus === "no").length;
        } else {
          const invites = await db.guestEventInvite.findMany({
            where: { eventId: event.id },
            select: { rsvpStatus: true },
          });

          total = invites.length;
          confirmed = invites.filter((i) => i.rsvpStatus === "yes").length;
          declined = invites.filter((i) => i.rsvpStatus === "no").length;
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
 * Create an event
 * @description Create a new wedding event. If isDefault is true, all guests are auto-invited (admin only)
 * @body CreateEventBody
 * @response 201:CreateEventResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
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
    const maxOrder = await db.event.aggregate({
      _max: { displayOrder: true },
    });

    const newOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    const event = await db.event.create({
      data: {
        name,
        description: description || null,
        eventDate: eventDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        locationName: locationName || null,
        locationAddress: locationAddress || null,
        latitude: latitude || null,
        longitude: longitude || null,
        isDefault: isDefault || false,
        displayOrder: newOrder,
      },
    });

    // If this is a default event, invite all guests
    if (isDefault) {
      const guests = await db.guest.findMany({ select: { id: true } });

      await db.guestEventInvite.createMany({
        data: guests.map((guest) => ({
          guestId: guest.id,
          eventId: event.id,
        })),
        skipDuplicates: true,
      });
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
