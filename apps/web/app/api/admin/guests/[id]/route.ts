import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { generateInviteCode } from "@/lib/utils/invite-code";

/**
 * Helper function to delete a party if it has no guests remaining
 */
async function deleteEmptyParty(
  partyId: string,
  weddingId: string,
): Promise<void> {
  try {
    const guestCount = await db.guest.count({
      where: { partyId, weddingId },
    });

    if (guestCount === 0) {
      await db.party.delete({
        where: { id: partyId },
      });
    }
  } catch (error) {
    // Log but don't fail the main operation
    console.error("Error cleaning up empty party:", error);
  }
}

/**
 * Get a guest by ID
 * @description Get a guest and their plus-one if they have one (admin only)
 * @pathParams IdParams
 * @response 200:GuestDetailResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await params;

    // Fetch the guest (scoped to wedding)
    const guest = await db.guest.findUnique({
      where: { id },
    });

    if (!guest || guest.weddingId !== weddingId) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Fetch plus-one if exists
    const plusOne = await db.guest.findFirst({
      where: {
        primaryGuestId: id,
        isPlusOne: true,
        weddingId,
      },
    });

    return NextResponse.json({ guest, plusOne: plusOne || null });
  } catch (error) {
    console.error("Error in GET /api/admin/guests/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Update a guest
 * @description Update a guest's details, manage plus-ones, and handle party reassignment (admin only)
 * @pathParams IdParams
 * @body UpdateGuestBody
 * @response 200:UpdateGuestResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await params;
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
      mailingAddress,
      physicalInviteSent,
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
      arrivalDate,
      arrivalTransport,
      departureDate,
      departureTransport,
      accommodationNotes,
      eventIds,
    } = body;

    // Fetch the current guest to check if they have a plus one (scoped to wedding)
    const currentGuest = await db.guest.findUnique({
      where: { id },
    });

    if (!currentGuest || currentGuest.weddingId !== weddingId) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Handle party change - get the new party's inviteCode if partyId changed
    let newPartyId = currentGuest.partyId;
    let newInviteCode = currentGuest.inviteCode;
    const sourcePartyId = currentGuest.partyId; // Track for cleanup

    if (partyId !== undefined && partyId !== currentGuest.partyId) {
      if (partyId) {
        // Moving to an existing party
        const targetParty = await db.party.findUnique({
          where: { id: partyId },
          select: { id: true, inviteCode: true },
        });

        if (!targetParty) {
          return NextResponse.json(
            { error: "Target party not found" },
            { status: 404 },
          );
        }

        newPartyId = targetParty.id;
        newInviteCode = targetParty.inviteCode;
      } else {
        // Removing from party — create a new solo party so the guest
        // always has a valid party + invite code for RSVP
        const soloCode = generateInviteCode();
        const soloParty = await db.party.create({
          data: {
            inviteCode: soloCode,
            name: `${currentGuest.firstName} ${currentGuest.lastName ?? ""}`.trim(),
            side: currentGuest.side,
            list: currentGuest.list,
            weddingId,
          },
        });
        newPartyId = soloParty.id;
        newInviteCode = soloCode;
      }
    }

    // Update the primary guest
    const updatedGuest = await db.guest.update({
      where: { id },
      data: {
        firstName: firstName || currentGuest.firstName,
        lastName:
          lastName !== undefined ? lastName || null : currentGuest.lastName,
        email: email || null,
        side: side !== undefined ? side : currentGuest.side,
        list: list || currentGuest.list,
        plusOneAllowed: plusOneAllowed || false,
        mailingAddress:
          mailingAddress !== undefined
            ? mailingAddress || null
            : currentGuest.mailingAddress,
        physicalInviteSent:
          physicalInviteSent !== undefined
            ? physicalInviteSent
            : currentGuest.physicalInviteSent,
        phoneNumber:
          phoneNumber !== undefined
            ? phoneNumber || null
            : currentGuest.phoneNumber,
        whatsapp:
          whatsapp !== undefined ? whatsapp || null : currentGuest.whatsapp,
        preferredContactMethod:
          preferredContactMethod !== undefined
            ? preferredContactMethod || null
            : currentGuest.preferredContactMethod,
        family: family !== undefined ? family : currentGuest.family,
        under21: under21 !== undefined ? under21 : currentGuest.under21,
        threeAndUnder:
          threeAndUnder !== undefined
            ? threeAndUnder
            : currentGuest.threeAndUnder,
        notes: notes !== undefined ? notes || null : currentGuest.notes,
        gender: gender !== undefined ? gender || null : currentGuest.gender,
        bridalPartyRole:
          bridalPartyRole !== undefined
            ? bridalPartyRole || null
            : currentGuest.bridalPartyRole,
        partyId: newPartyId,
        inviteCode: newInviteCode,
        arrivalDate:
          arrivalDate !== undefined
            ? arrivalDate || null
            : currentGuest.arrivalDate,
        arrivalTransport:
          arrivalTransport !== undefined
            ? arrivalTransport || null
            : currentGuest.arrivalTransport,
        departureDate:
          departureDate !== undefined
            ? departureDate || null
            : currentGuest.departureDate,
        departureTransport:
          departureTransport !== undefined
            ? departureTransport || null
            : currentGuest.departureTransport,
        accommodationNotes:
          accommodationNotes !== undefined
            ? accommodationNotes || null
            : currentGuest.accommodationNotes,
      },
    });

    // Handle plus one logic
    if (plusOneAllowed) {
      // Check if plus one already exists
      const existingPlusOne = await db.guest.findFirst({
        where: {
          primaryGuestId: id,
          isPlusOne: true,
          weddingId,
        },
      });

      // Determine plus-one name: use provided name or create placeholder
      const primaryFullName =
        `${updatedGuest?.firstName || currentGuest.firstName}${
          updatedGuest?.lastName || currentGuest.lastName
            ? ` ${updatedGuest?.lastName || currentGuest.lastName}`
            : ""
        }`.trim();
      const plusOneFirstNameFinal = plusOneFirstName?.trim() || primaryFullName;
      const plusOneLastNameFinal = plusOneFirstName?.trim()
        ? plusOneLastName || null
        : "- Plus One";

      if (existingPlusOne) {
        // Update existing plus one
        // Note: list and family are automatically cascaded by database trigger
        await db.guest.update({
          where: { id: existingPlusOne.id },
          data: {
            firstName: plusOneFirstNameFinal,
            lastName: plusOneLastNameFinal,
            side: side !== undefined ? side : currentGuest.side,
            partyId: newPartyId,
            inviteCode: newInviteCode,
          },
        });
      } else {
        // Create new plus one
        // Note: list and family will be automatically set by database trigger on first update
        // For initial creation, we set them explicitly since trigger only runs on UPDATE
        await db.guest.create({
          data: {
            firstName: plusOneFirstNameFinal,
            lastName: plusOneLastNameFinal,
            email: null,
            inviteCode: newInviteCode,
            partyId: newPartyId,
            side: side !== undefined ? side : currentGuest.side,
            list: list || currentGuest.list,
            isPlusOne: true,
            plusOneAllowed: false,
            primaryGuestId: id,
            rsvpStatus: "pending",
            numberOfResends: 0,
            physicalInviteSent: false,
            family: family !== undefined ? family : currentGuest.family,
            under21: under21 !== undefined ? under21 : currentGuest.under21,
            threeAndUnder:
              threeAndUnder !== undefined
                ? threeAndUnder
                : currentGuest.threeAndUnder,
            weddingId,
          },
        });
      }
    } else {
      // Remove plus one if it exists and plusOneAllowed is false
      await db.guest.deleteMany({
        where: {
          primaryGuestId: id,
          isPlusOne: true,
          weddingId,
        },
      });
    }

    // Clean up the source party if it's now empty (guest was moved to a different party)
    if (sourcePartyId && sourcePartyId !== newPartyId) {
      await deleteEmptyParty(sourcePartyId, weddingId);
    }

    // Sync event invitations if eventIds provided
    if (Array.isArray(eventIds)) {
      const guestIdsToSync = [id];
      // Also sync plus-one's event invites
      const plusOneGuest = await db.guest.findFirst({
        where: { primaryGuestId: id, isPlusOne: true, weddingId },
        select: { id: true },
      });
      if (plusOneGuest) guestIdsToSync.push(plusOneGuest.id);

      for (const gId of guestIdsToSync) {
        // Remove invites for events no longer selected
        await db.guestEventInvite.deleteMany({
          where: {
            guestId: gId,
            weddingId,
            eventId: { notIn: eventIds },
          },
        });

        // Add invites for newly selected events
        await db.guestEventInvite.createMany({
          data: eventIds.map((eId: string) => ({
            guestId: gId,
            eventId: eId,
            weddingId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ guest: updatedGuest });
  } catch (error) {
    console.error("Error in PATCH /api/admin/guests/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
