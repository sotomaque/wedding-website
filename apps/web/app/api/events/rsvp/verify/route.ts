import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/events/rsvp/verify
 * Verify an invite code and check if guest is invited to a specific event
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const eventId = searchParams.get("eventId");

    if (!code || !eventId) {
      return NextResponse.json(
        { error: "Invite code and event ID are required" },
        { status: 400 },
      );
    }

    // Normalize code to uppercase
    const normalizedCode = code.toUpperCase().trim();

    // Find guest with this invite code
    const guest = await db
      .selectFrom("guests")
      .selectAll()
      .where("invite_code", "=", normalizedCode)
      .where("is_plus_one", "=", false) // Only match primary guests
      .executeTakeFirst();

    if (!guest) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    // Verify event exists
    const event = await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirst();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if guest is invited to this event
    const invite = await db
      .selectFrom("guest_event_invites")
      .selectAll()
      .where("guest_id", "=", guest.id)
      .where("event_id", "=", eventId)
      .executeTakeFirst();

    if (!invite) {
      return NextResponse.json(
        { error: "You are not invited to this event" },
        { status: 403 },
      );
    }

    // Format event date if present
    const eventDateStr = event.event_date
      ? event.event_date instanceof Date
        ? event.event_date.toISOString().split("T")[0]
        : String(event.event_date)
      : null;

    return NextResponse.json({
      guest: {
        id: guest.id,
        firstName: guest.first_name,
        lastName: guest.last_name,
        email: guest.email,
        inviteCode: guest.invite_code,
      },
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: eventDateStr,
        startTime: event.start_time,
        endTime: event.end_time,
        locationName: event.location_name,
        locationAddress: event.location_address,
      },
      invite: {
        id: invite.id,
        rsvpStatus: invite.rsvp_status,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/events/rsvp/verify:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
