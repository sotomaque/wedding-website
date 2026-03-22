import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * List event invites
 * @description Get all guests with their invite status for a specific event, including RSVP counts and email tracking
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
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

    // Verify event exists and is not a default event
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isDefault) {
      return NextResponse.json(
        { error: "Cannot manage invites for default events" },
        { status: 400 },
      );
    }

    const weddingId = await getWeddingId();

    // Get all guests with their invite status for this event
    const guests = await db.guest.findMany({
      where: { isPlusOne: false, weddingId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        inviteCode: true,
        rsvpStatus: true,
        isPlusOne: true,
        side: true,
        list: true,
        guestEventInvites: {
          where: { eventId },
          select: {
            id: true,
            rsvpStatus: true,
            emailSent: true,
            emailSentAt: true,
            emailResendCount: true,
          },
        },
      },
      orderBy: { firstName: "asc" },
    });

    // Transform the data
    const guestsWithInviteStatus = guests.map((guest) => {
      const invite = guest.guestEventInvites[0] || null;
      return {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        inviteCode: guest.inviteCode,
        mainRsvpStatus: guest.rsvpStatus,
        side: guest.side,
        list: guest.list,
        isInvited: invite !== null,
        eventRsvpStatus: invite?.rsvpStatus || null,
        emailSent: invite?.emailSent || false,
        emailSentAt: invite?.emailSentAt || null,
        emailResendCount: invite?.emailResendCount || 0,
      };
    });

    // Get counts
    const invitedCount = guestsWithInviteStatus.filter(
      (g) => g.isInvited,
    ).length;
    const emailSentCount = guestsWithInviteStatus.filter(
      (g) => g.emailSent,
    ).length;
    const confirmedCount = guestsWithInviteStatus.filter(
      (g) => g.eventRsvpStatus === "yes",
    ).length;
    const declinedCount = guestsWithInviteStatus.filter(
      (g) => g.eventRsvpStatus === "no",
    ).length;

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        eventDate: event.eventDate,
        startTime: event.startTime,
        locationName: event.locationName,
      },
      guests: guestsWithInviteStatus,
      counts: {
        total: guestsWithInviteStatus.length,
        invited: invitedCount,
        emailSent: emailSentCount,
        confirmed: confirmedCount,
        declined: declinedCount,
        pending: invitedCount - confirmedCount - declinedCount,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/events/[id]/invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Add guests to event
 * @description Create guest_event_invites records to invite guests to this event
 * @pathParams IdParams
 * @body GuestIdsBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
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
    const { guestIds } = body;

    if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json(
        { error: "Guest IDs array is required" },
        { status: 400 },
      );
    }

    // Verify event exists and is not a default event
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isDefault) {
      return NextResponse.json(
        { error: "Cannot manage invites for default events" },
        { status: 400 },
      );
    }

    const weddingId = await getWeddingId();

    // Create invite records for each guest (skip duplicates)
    const result = await db.guestEventInvite.createMany({
      data: guestIds.map((guestId: string) => ({
        guestId,
        eventId,
        weddingId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      addedCount: result.count,
      totalRequested: guestIds.length,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/events/[id]/invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Remove guests from event
 * @description Delete guest_event_invites records to remove guests from this event
 * @pathParams IdParams
 * @body GuestIdsBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
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
    const { guestIds } = body;

    if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json(
        { error: "Guest IDs array is required" },
        { status: 400 },
      );
    }

    // Verify event exists and is not a default event
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isDefault) {
      return NextResponse.json(
        { error: "Cannot manage invites for default events" },
        { status: 400 },
      );
    }

    const weddingId = await getWeddingId();

    // Delete invite records
    const result = await db.guestEventInvite.deleteMany({
      where: {
        eventId,
        guestId: { in: guestIds },
        weddingId,
      },
    });

    return NextResponse.json({
      success: true,
      removedCount: result.count,
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/events/[id]/invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
