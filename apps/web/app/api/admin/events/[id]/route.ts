import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Get event by ID
 * @description Get a single event with RSVP counts (admin only)
 * @pathParams IdParams
 * @response 200:EventDetailResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
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

    const event = await db.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get invite counts
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
        where: { eventId: id },
        select: { rsvpStatus: true },
      });

      total = invites.length;
      confirmed = invites.filter((i) => i.rsvpStatus === "yes").length;
      declined = invites.filter((i) => i.rsvpStatus === "no").length;
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
 * Update an event
 * @description Update event details. Setting isDefault to true auto-invites all guests (admin only)
 * @pathParams IdParams
 * @body UpdateEventBody
 * @response 200:EventDetailResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
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

    // Get current event to check if isDefault changed
    const currentEvent = await db.event.findUnique({
      where: { id },
    });

    if (!currentEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (eventDate !== undefined) updateData.eventDate = eventDate;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime || null;
    if (locationName !== undefined) updateData.locationName = locationName;
    if (locationAddress !== undefined)
      updateData.locationAddress = locationAddress || null;
    if (latitude !== undefined) updateData.latitude = latitude || null;
    if (longitude !== undefined) updateData.longitude = longitude || null;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const event = await db.event.update({
      where: { id },
      data: updateData,
    });

    // If event became a default event, invite all guests who aren't already invited
    if (isDefault === true && currentEvent.isDefault === false) {
      const guests = await db.guest.findMany({ select: { id: true } });

      await db.guestEventInvite.createMany({
        data: guests.map((guest) => ({
          guestId: guest.id,
          eventId: id,
        })),
        skipDuplicates: true,
      });
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
 * Delete an event
 * @description Delete an event and cascade delete all invites (admin only)
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
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
    try {
      await db.event.delete({
        where: { id },
      });
    } catch {
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
