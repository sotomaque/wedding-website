import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { generateIcs } from "@/lib/calendar/generate-ics";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getEmailFromAddress } from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { sendEmail } from "@/lib/email/resend-client";

/**
 * Send a calendar invite email to a specific attending guest
 * @description Sends a .ics calendar invite for all default wedding events to the guest
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id: guestId } = await params;

    const guest = await db.guest.findFirst({
      where: { id: guestId, weddingId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        rsvpStatus: true,
        calendarInviteResendCount: true,
        preferredLanguage: true,
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    if (guest.rsvpStatus !== "yes") {
      return NextResponse.json(
        { error: "Guest has not confirmed attendance" },
        { status: 400 },
      );
    }

    if (!guest.email || !guest.email.includes("@")) {
      return NextResponse.json(
        { error: "Guest has no valid email address" },
        { status: 400 },
      );
    }

    const defaultEvents = await db.event.findMany({
      where: { isDefault: true, weddingId },
      select: {
        id: true,
        name: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        locationName: true,
        locationAddress: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    if (defaultEvents.length === 0) {
      return NextResponse.json(
        { error: "No default events found to include in invite" },
        { status: 500 },
      );
    }

    const guestName = `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`;

    const eventsForIcs = defaultEvents.map((e) => ({
      id: e.id,
      name: e.name,
      event_date:
        e.eventDate instanceof Date
          ? e.eventDate
          : e.eventDate
            ? new Date(`${e.eventDate}T00:00:00`)
            : null,
      start_time: e.startTime
        ? e.startTime instanceof Date
          ? e.startTime.toISOString()
          : String(e.startTime)
        : null,
      end_time: e.endTime
        ? e.endTime instanceof Date
          ? e.endTime.toISOString()
          : String(e.endTime)
        : null,
      location_name: e.locationName,
      location_address: e.locationAddress,
    }));

    const settings = await getWeddingSettings();
    const icsContent = generateIcs(
      eventsForIcs,
      guestName,
      settings.coupleName,
    );

    const primaryEvent = defaultEvents[0];
    const primaryEventDate = primaryEvent?.eventDate
      ? primaryEvent.eventDate instanceof Date
        ? primaryEvent.eventDate.toISOString().split("T")[0]
        : String(primaryEvent.eventDate)
      : "";
    const primaryEventTime = primaryEvent?.startTime
      ? primaryEvent.startTime instanceof Date
        ? primaryEvent.startTime.toISOString()
        : String(primaryEvent.startTime)
      : "";

    const rendered = await renderEmailTemplate(
      weddingId,
      "calendar_invite",
      {
        GUEST_NAME: guestName,
        COUPLE_NAMES: settings.coupleName,
        EVENT_NAME: primaryEvent?.name || "",
        EVENT_DATE: primaryEventDate ?? "",
        EVENT_TIME: primaryEventTime ?? "",
        VENUE_NAME: primaryEvent?.locationName || "",
        VENUE_ADDRESS: primaryEvent?.locationAddress || "",
      },
      guest.preferredLanguage ?? settings.defaultLanguage,
    );

    if (!rendered) {
      return NextResponse.json(
        { error: "Calendar invite template is inactive or not found" },
        { status: 400 },
      );
    }

    const result = await sendEmail({
      from: getEmailFromAddress(settings),
      to: guest.email,
      subject: rendered.subject,
      html: rendered.html,
      attachments: [
        {
          filename: `${settings.slug}-wedding.ics`,
          content: Buffer.from(icsContent).toString("base64"),
        },
      ],
      log: { weddingId, guestId, type: "calendar_invite" },
    });

    if (result.error) {
      console.error("Error sending calendar invite:", result.error);
      return NextResponse.json(
        { error: "Failed to send calendar invite" },
        { status: 500 },
      );
    }

    await db.guest.update({
      where: { id: guestId },
      data: {
        calendarInviteSent: true,
        calendarInviteSentAt: new Date().toISOString(),
        calendarInviteResendCount: (guest.calendarInviteResendCount || 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Calendar invite sent successfully",
      email: guest.email,
    });
  } catch (error) {
    console.error(
      "Error in POST /api/admin/guests/[id]/send-calendar-invite:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
