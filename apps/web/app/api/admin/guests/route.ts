import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { sendEmail } from "@/lib/email/resend-client";
import { weddingUrl } from "@/lib/url";
import { formatEventDate, formatEventTime } from "@/lib/utils/event-format";
import { generateInviteCode } from "@/lib/utils/invite-code";

/**
 * List all guests
 * @description Fetch all guests ordered by creation date (admin only)
 * @response 200:GuestListResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function GET() {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const guests = await db.guest.findMany({
      where: { weddingId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ guests });
  } catch (error) {
    console.error("Error in GET /api/admin/guests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Create a guest
 * @description Create a new guest, optionally with a plus-one, and send invitation email (admin only)
 * @body CreateGuestBody
 * @response 201:CreateGuestResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      side,
      list,
      plusOneAllowed,
      plusOneFirstName,
      plusOneLastName,
      sendEmail: shouldSendEmail,
      mailingAddress,
      phoneNumber,
      whatsapp,
      preferredContactMethod,
      family,
      under21,
      threeAndUnder,
      notes,
      gender,
      bridalPartyRole,
      partyId,
      eventIds,
    } = body;

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 },
      );
    }

    let inviteCode: string;
    let targetPartyId: string;

    // If partyId is provided, add guest to existing party
    if (partyId) {
      const existingParty = await db.party.findUnique({
        where: { id: partyId },
        select: { id: true, inviteCode: true },
      });

      if (!existingParty) {
        return NextResponse.json({ error: "Party not found" }, { status: 404 });
      }

      inviteCode = existingParty.inviteCode;
      targetPartyId = existingParty.id;
    } else {
      // Generate unique invite code for new party
      inviteCode = generateInviteCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existing = await db.party.findUnique({
          where: { inviteCode },
          select: { id: true },
        });

        if (!existing) break;

        inviteCode = generateInviteCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: "Failed to generate unique invite code" },
          { status: 500 },
        );
      }

      // Create new party
      const newParty = await db.party.create({
        data: {
          inviteCode,
          side: side || null,
          list: list || "a",
          weddingId,
        },
        select: { id: true },
      });

      targetPartyId = newParty.id;
    }

    // Insert primary guest
    const guest = await db.guest.create({
      data: {
        firstName,
        lastName: lastName || null,
        email: email || null,
        inviteCode,
        partyId: targetPartyId,
        side: side || null,
        list: list || "a",
        isPlusOne: false,
        plusOneAllowed: plusOneAllowed || false,
        rsvpStatus: "pending",
        numberOfResends: 0,
        mailingAddress: mailingAddress || null,
        physicalInviteSent: false,
        phoneNumber: phoneNumber || null,
        whatsapp: whatsapp || null,
        preferredContactMethod: preferredContactMethod || null,
        family: family || false,
        under21: under21 || false,
        threeAndUnder: threeAndUnder || false,
        notes: notes || null,
        gender: gender || null,
        bridalPartyRole: bridalPartyRole || null,
        weddingId,
      },
    });

    // If plus one is allowed, always create the plus one guest record
    let plusOneGuest = null;
    if (plusOneAllowed) {
      try {
        // Determine plus-one name: use provided name or create placeholder
        const primaryFullName =
          `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();
        const plusOneFirstNameFinal =
          plusOneFirstName?.trim() || primaryFullName;
        const plusOneLastNameFinal = plusOneFirstName?.trim()
          ? plusOneLastName || null
          : "- Plus One";

        plusOneGuest = await db.guest.create({
          data: {
            firstName: plusOneFirstNameFinal,
            lastName: plusOneLastNameFinal,
            email: null,
            inviteCode,
            partyId: targetPartyId,
            side: side || null,
            list: list || "a",
            isPlusOne: true,
            plusOneAllowed: false,
            primaryGuestId: guest.id,
            rsvpStatus: "pending",
            numberOfResends: 0,
            mailingAddress: null,
            physicalInviteSent: false,
            phoneNumber: null,
            whatsapp: null,
            preferredContactMethod: null,
            family: family || false,
            under21: under21 || false,
            threeAndUnder: threeAndUnder || false,
            notes: null,
            weddingId,
          },
        });
      } catch (plusOneError) {
        console.error("Error creating plus one:", plusOneError);
        // Don't fail the entire request, just log it
      }
    }

    // Create event invites for selected events
    const selectedEventIds = Array.isArray(eventIds) ? eventIds : [];
    if (selectedEventIds.length > 0) {
      const guestIdsToInvite = [guest.id];
      if (plusOneGuest) guestIdsToInvite.push(plusOneGuest.id);

      await db.guestEventInvite.createMany({
        data: guestIdsToInvite.flatMap((gId) =>
          selectedEventIds.map((eId: string) => ({
            guestId: gId,
            eventId: eId,
            weddingId,
          })),
        ),
        skipDuplicates: true,
      });
    }

    // Send email if requested
    const settings = await getWeddingSettings();
    const notificationRecipients = getNotificationRecipients(settings);
    if (shouldSendEmail && notificationRecipients.length > 0 && email) {
      const guestName = `${firstName} ${lastName || ""}`.trim();
      const language = guest.preferredLanguage ?? settings.defaultLanguage;

      // Fetch all events to determine if all are selected
      const allEvents = await db.event.findMany({
        where: { weddingId },
        select: { id: true },
      });
      const isAllEvents =
        allEvents.length > 0 && selectedEventIds.length >= allEvents.length;

      if (isAllEvents) {
        // All events selected → single wedding invitation (existing behavior)
        const rsvpUrl = `${weddingUrl(settings.slug, "/rsvp")}?code=${inviteCode}`;

        let weddingDate = "";
        let venueName = "";
        let venueAddress = "";
        try {
          const ceremonyEvent = await db.event.findFirst({
            where: { name: "Wedding Ceremony", weddingId },
            select: {
              eventDate: true,
              locationName: true,
              locationAddress: true,
            },
          });
          venueName = ceremonyEvent?.locationName ?? "";
          venueAddress = ceremonyEvent?.locationAddress ?? "";
          if (ceremonyEvent?.eventDate) {
            const dateObj =
              ceremonyEvent.eventDate instanceof Date
                ? ceremonyEvent.eventDate
                : new Date(`${ceremonyEvent.eventDate}T00:00:00`);
            if (!Number.isNaN(dateObj.getTime())) {
              weddingDate = dateObj.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            }
          }
        } catch (dateError) {
          console.error("Error fetching wedding date:", dateError);
        }

        try {
          const rendered = await renderEmailTemplate(
            weddingId,
            "wedding_invitation",
            {
              COUPLE_NAMES: settings.coupleName,
              GUEST_NAME: guestName,
              INVITE_CODE: inviteCode,
              RSVP_URL: rsvpUrl,
              WEDDING_DATE: weddingDate,
              VENUE_NAME: venueName,
              VENUE_ADDRESS: venueAddress,
              PERSONAL_MESSAGE: "",
            },
            language,
          );

          if (rendered) {
            await sendEmail({
              from: getEmailFromAddress(settings, "Wedding Invitation"),
              to: email,
              subject: rendered.subject,
              html: rendered.html,
            });
            await db.guest.update({
              where: { id: guest.id },
              data: { numberOfResends: 1 },
            });
          }
        } catch (emailError) {
          console.error("Error sending wedding invitation email:", emailError);
        }
      } else if (selectedEventIds.length > 0) {
        // Partial events → send individual event invitation per event
        const selectedEvents = await db.event.findMany({
          where: { id: { in: selectedEventIds }, weddingId },
        });

        for (const event of selectedEvents) {
          try {
            const rsvpUrl = `${weddingUrl(settings.slug, "/events/rsvp")}?code=${inviteCode}&event=${event.id}`;
            const rendered = await renderEmailTemplate(
              weddingId,
              "event_invitation",
              {
                GUEST_NAME: guestName,
                COUPLE_NAMES: settings.coupleName,
                EVENT_NAME: event.name,
                EVENT_DESCRIPTION: event.description || "",
                EVENT_DATE: formatEventDate(event.eventDate),
                EVENT_TIME: formatEventTime(event.startTime, event.endTime),
                LOCATION_NAME: event.locationName || "",
                LOCATION_ADDRESS: event.locationAddress || "",
                INVITE_CODE: inviteCode,
                RSVP_URL: rsvpUrl,
                BACKGROUND_IMAGE_URL: "",
              },
              language,
            );

            if (rendered) {
              await sendEmail({
                from: getEmailFromAddress(settings),
                to: email,
                subject: rendered.subject,
                html: rendered.html,
              });

              // Mark the GuestEventInvite as emailed
              const invite = await db.guestEventInvite.findFirst({
                where: {
                  guestId: guest.id,
                  eventId: event.id,
                  weddingId,
                },
              });
              if (invite) {
                await db.guestEventInvite.update({
                  where: { id: invite.id },
                  data: {
                    emailSent: true,
                    emailSentAt: new Date().toISOString(),
                    emailResendCount: 1,
                  },
                });
              }
            }
          } catch (emailError) {
            console.error(
              `Error sending event invitation for ${event.name}:`,
              emailError,
            );
          }
        }

        await db.guest.update({
          where: { id: guest.id },
          data: { numberOfResends: 1 },
        });
      }
    }

    return NextResponse.json({
      guest,
      plusOneGuest: plusOneGuest || null,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/guests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Delete a guest
 * @description Delete a guest by ID passed as query parameter (admin only)
 * @params DeleteGuestParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function DELETE(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Guest ID is required" },
        { status: 400 },
      );
    }

    // Verify guest belongs to this wedding before deleting
    const guest = await db.guest.findUnique({ where: { id } });
    if (!guest || guest.weddingId !== weddingId) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    await db.guest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/guests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
