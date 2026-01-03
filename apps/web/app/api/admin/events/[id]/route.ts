import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/events/[id]
 * Get a single event with its invites (admin only)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get invite counts
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
        .where("event_id", "=", id)
        .execute();

      total = invites.length;
      confirmed = invites.filter((i) => i.rsvp_status === "yes").length;
      declined = invites.filter((i) => i.rsvp_status === "no").length;
    }

    return NextResponse.json({
      event: {
        ...event,
        inviteCount: total,
        confirmedCount: confirmed,
        declinedCount: declined,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/events/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/events/[id]
 * Update an event (admin only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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
      displayOrder,
    } = body;

    // Get current event to check if is_default changed
    const currentEvent = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!currentEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (eventDate !== undefined) updateData.event_date = eventDate;
    if (startTime !== undefined) updateData.start_time = startTime;
    if (endTime !== undefined) updateData.end_time = endTime || null;
    if (locationName !== undefined) updateData.location_name = locationName;
    if (locationAddress !== undefined)
      updateData.location_address = locationAddress || null;
    if (latitude !== undefined) updateData.latitude = latitude || null;
    if (longitude !== undefined) updateData.longitude = longitude || null;
    if (isDefault !== undefined) updateData.is_default = isDefault;
    if (displayOrder !== undefined) updateData.display_order = displayOrder;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const event = await db
      .updateTable("events")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    // If event became a default event, invite all guests who aren't already invited
    if (isDefault === true && currentEvent.is_default === false) {
      const guests = await db.selectFrom("guests").select("id").execute();

      for (const guest of guests) {
        await db
          .insertInto("guest_event_invites")
          .values({
            guest_id: guest.id,
            event_id: id,
          })
          .onConflict((oc) => oc.columns(["guest_id", "event_id"]).doNothing())
          .execute();
      }
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error in PATCH /api/admin/events/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/events/[id]
 * Delete an event (admin only)
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    // Deleting the event will cascade delete all guest_event_invites
    const deleted = await db
      .deleteFrom("events")
      .where("id", "=", id)
      .executeTakeFirst();

    if (deleted.numDeletedRows === 0n) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/events/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
