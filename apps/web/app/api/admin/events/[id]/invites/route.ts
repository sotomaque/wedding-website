import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/events/[id]/invites
 * Get all guests with their invite status for this event (admin only)
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
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirst();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.is_default) {
      return NextResponse.json(
        { error: "Cannot manage invites for default events" },
        { status: 400 },
      );
    }

    // Get all guests with their invite status for this event
    const guests = await db
      .selectFrom("guests")
      .leftJoin("guest_event_invites", (join) =>
        join
          .onRef("guests.id", "=", "guest_event_invites.guest_id")
          .on("guest_event_invites.event_id", "=", eventId),
      )
      .select([
        "guests.id",
        "guests.first_name",
        "guests.last_name",
        "guests.email",
        "guests.invite_code",
        "guests.rsvp_status as main_rsvp_status",
        "guests.is_plus_one",
        "guests.side",
        "guests.list",
        "guest_event_invites.id as invite_id",
        "guest_event_invites.rsvp_status as event_rsvp_status",
        "guest_event_invites.email_sent",
        "guest_event_invites.email_sent_at",
        "guest_event_invites.email_resend_count",
      ])
      .where("guests.is_plus_one", "=", false) // Only show primary guests
      .orderBy("guests.first_name", "asc")
      .execute();

    // Transform the data
    const guestsWithInviteStatus = guests.map((guest) => ({
      id: guest.id,
      firstName: guest.first_name,
      lastName: guest.last_name,
      email: guest.email,
      inviteCode: guest.invite_code,
      mainRsvpStatus: guest.main_rsvp_status,
      side: guest.side,
      list: guest.list,
      isInvited: guest.invite_id !== null,
      eventRsvpStatus: guest.event_rsvp_status || null,
      emailSent: guest.email_sent || false,
      emailSentAt: guest.email_sent_at || null,
      emailResendCount: guest.email_resend_count || 0,
    }));

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
        eventDate: event.event_date,
        startTime: event.start_time,
        locationName: event.location_name,
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
 * POST /api/admin/events/[id]/invites
 * Add guests to this event (create guest_event_invites records)
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
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirst();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.is_default) {
      return NextResponse.json(
        { error: "Cannot manage invites for default events" },
        { status: 400 },
      );
    }

    // Create invite records for each guest
    let addedCount = 0;
    for (const guestId of guestIds) {
      try {
        await db
          .insertInto("guest_event_invites")
          .values({
            guest_id: guestId,
            event_id: eventId,
          })
          .onConflict((oc) => oc.columns(["guest_id", "event_id"]).doNothing())
          .execute();
        addedCount++;
      } catch (err) {
        console.error(`Error adding guest ${guestId} to event:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      addedCount,
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
 * DELETE /api/admin/events/[id]/invites
 * Remove guests from this event (delete guest_event_invites records)
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
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirst();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.is_default) {
      return NextResponse.json(
        { error: "Cannot manage invites for default events" },
        { status: 400 },
      );
    }

    // Delete invite records
    const result = await db
      .deleteFrom("guest_event_invites")
      .where("event_id", "=", eventId)
      .where("guest_id", "in", guestIds)
      .execute();

    return NextResponse.json({
      success: true,
      removedCount: Number(result[0]?.numDeletedRows || 0),
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/events/[id]/invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
