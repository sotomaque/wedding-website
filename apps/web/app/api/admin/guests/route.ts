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

    // Send email if requested
    const settings = await getWeddingSettings();
    const notificationRecipients = getNotificationRecipients(settings);
    if (shouldSendEmail && notificationRecipients.length > 0) {
      const rsvpUrl = `${weddingUrl(settings.slug, "/rsvp")}?code=${inviteCode}`;
      const appUrl = weddingUrl(settings.slug);

      // Fetch wedding date and venue from the Wedding Ceremony event
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
          const dateValue = ceremonyEvent.eventDate;
          const dateObj =
            dateValue instanceof Date
              ? dateValue
              : new Date(`${dateValue}T00:00:00`);

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
            GUEST_NAME: `${firstName} ${lastName || ""}`.trim(),
            INVITE_CODE: inviteCode,
            RSVP_URL: rsvpUrl,
            WEDDING_DATE: weddingDate,
            VENUE_NAME: venueName,
            VENUE_ADDRESS: venueAddress,
            PERSONAL_MESSAGE: "",
          },
          guest.preferredLanguage ?? settings.defaultLanguage,
        );

        if (!rendered) {
          console.log(
            "Wedding invitation template inactive, skipping email send",
          );
        } else {
          await sendEmail({
            from: getEmailFromAddress(settings, "Wedding Invitation"),
            to: email,
            subject: rendered.subject,
            html: rendered.html,
          });

          // Update numberOfResends to 1 after successful email send
          await db.guest.update({
            where: { id: guest.id },
            data: { numberOfResends: 1 },
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the request if email fails
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
