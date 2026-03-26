import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Verify event invite code
 * @description Verify an invite code and check if the guest is invited to a specific event, returning guest and event details
 * @params EventRsvpVerifyParams
 * @response 200:SuccessResponse
 * @tag Events RSVP
 * @openapi
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
    const weddingId = await getWeddingId();

    // Find guest with this invite code
    const guest = await db.guest.findFirst({
      where: {
        inviteCode: normalizedCode,
        isPlusOne: false, // Only match primary guests
        weddingId,
      },
    });

    if (!guest) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    // Verify event exists and belongs to this wedding
    const event = await db.event.findUnique({
      where: { id: eventId, weddingId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if guest is invited to this event
    const invite = await db.guestEventInvite.findFirst({
      where: {
        guestId: guest.id,
        eventId: eventId,
        weddingId,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "You are not invited to this event" },
        { status: 403 },
      );
    }

    // Format event date if present
    const eventDateStr = event.eventDate
      ? event.eventDate instanceof Date
        ? event.eventDate.toISOString().split("T")[0]
        : String(event.eventDate)
      : null;

    return NextResponse.json({
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        inviteCode: guest.inviteCode,
      },
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: eventDateStr,
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName,
        locationAddress: event.locationAddress,
      },
      invite: {
        id: invite.id,
        rsvpStatus: invite.rsvpStatus,
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
