import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

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
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await context.params;

    const event = await db.event.findUnique({
      where: { id, weddingId },
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
        where: { weddingId },
        select: { rsvpStatus: true },
      });

      total = guests.length;
      confirmed = guests.filter((g) => g.rsvpStatus === "yes").length;
      declined = guests.filter((g) => g.rsvpStatus === "no").length;
    } else {
      const invites = await db.guestEventInvite.findMany({
        where: { eventId: id, weddingId },
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
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await context.params;
    const body = await request.json();
    const {
      name,
      description,
      eventDate,
      endDate,
      startTime,
      endTime,
      locationName,
      locationAddress,
      latitude,
      longitude,
      isDefault,
      displayOrder,
      capacity,
      publicRsvpEnabled,
      imageUrl,
    } = body;

    // Get current event to check if isDefault changed
    const currentEvent = await db.event.findUnique({
      where: { id, weddingId },
    });

    if (!currentEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (eventDate !== undefined)
      updateData.eventDate = eventDate
        ? new Date(`${eventDate}T00:00:00Z`)
        : null;
    if (endDate !== undefined)
      updateData.endDate = endDate ? new Date(`${endDate}T00:00:00Z`) : null;
    if (startTime !== undefined)
      updateData.startTime = startTime
        ? new Date(`1970-01-01T${startTime}:00Z`)
        : null;
    if (endTime !== undefined)
      updateData.endTime = endTime
        ? new Date(`1970-01-01T${endTime}:00Z`)
        : null;
    if (locationName !== undefined) updateData.locationName = locationName;
    if (locationAddress !== undefined)
      updateData.locationAddress = locationAddress || null;
    if (latitude !== undefined) updateData.latitude = latitude || null;
    if (longitude !== undefined) updateData.longitude = longitude || null;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (capacity !== undefined)
      updateData.capacity =
        capacity === null || capacity === "" ? null : Number(capacity);
    if (publicRsvpEnabled !== undefined)
      updateData.publicRsvpEnabled = Boolean(publicRsvpEnabled);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;

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
      const guests = await db.guest.findMany({
        where: { weddingId },
        select: { id: true },
      });

      await db.guestEventInvite.createMany({
        data: guests.map((guest) => ({
          guestId: guest.id,
          eventId: id,
          weddingId,
        })),
        skipDuplicates: true,
      });
    }

    // If event was default and is now non-default, backfill GuestEventInvite.rsvpStatus
    // from each guest's main rsvpStatus so RSVP data isn't lost
    if (isDefault === false && currentEvent.isDefault === true) {
      const guests = await db.guest.findMany({
        where: { weddingId },
        select: { id: true, rsvpStatus: true },
      });

      for (const guest of guests) {
        if (guest.rsvpStatus === "pending") continue;
        await db.guestEventInvite.updateMany({
          where: {
            guestId: guest.id,
            eventId: id,
            weddingId,
            rsvpStatus: "pending",
          },
          data: { rsvpStatus: guest.rsvpStatus },
        });
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
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await context.params;

    // Verify event belongs to this wedding before deleting
    const event = await db.event.findUnique({
      where: { id, weddingId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Deleting the event will cascade delete all guest_event_invites
    await db.event.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/events/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
