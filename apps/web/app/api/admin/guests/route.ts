import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
import { getWeddingId } from "@/lib/db/wedding-context";
import { WEDDING_INVITATION_TEMPLATE_ALIAS } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/resend-client";
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

    const weddingId = await getWeddingId();

    // Kysely query - fetch all guests ordered by created_at
    const guests = await db
      .selectFrom("guests")
      .where("wedding_id", "=", weddingId)
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

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

    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);

    let inviteCode: string;
    let targetPartyId: string;

    // If partyId is provided, add guest to existing party
    if (partyId) {
      const existingParty = await db
        .selectFrom("parties")
        .where("wedding_id", "=", weddingId)
        .select(["id", "invite_code"])
        .where("id", "=", partyId)
        .executeTakeFirst();

      if (!existingParty) {
        return NextResponse.json({ error: "Party not found" }, { status: 404 });
      }

      inviteCode = existingParty.invite_code;
      targetPartyId = existingParty.id;
    } else {
      // Generate unique invite code for new party
      inviteCode = generateInviteCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        // Kysely query - check if invite code exists in parties table
        const existing = await db
          .selectFrom("parties")
          .where("wedding_id", "=", weddingId)
          .select("id")
          .where("invite_code", "=", inviteCode)
          .executeTakeFirst();

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
      const newParty = await weddingDb
        .insertInto("parties", {
          invite_code: inviteCode,
          side: side || null,
          list: list || "a",
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      targetPartyId = newParty.id;
    }

    // Kysely query - insert primary guest
    const guest = await weddingDb
      .insertInto("guests", {
        first_name: firstName,
        last_name: lastName || null,
        email: email || null,
        invite_code: inviteCode,
        party_id: targetPartyId,
        side: side || null,
        list: list || "a",
        is_plus_one: false,
        plus_one_allowed: plusOneAllowed || false,
        rsvp_status: "pending",
        number_of_resends: 0,
        mailing_address: mailingAddress || null,
        physical_invite_sent: false,
        phone_number: phoneNumber || null,
        whatsapp: whatsapp || null,
        preferred_contact_method: preferredContactMethod || null,
        family: family || false,
        under_21: under21 || false,
        three_and_under: threeAndUnder || false,
        notes: notes || null,
        gender: gender || null,
        bridal_party_role: bridalPartyRole || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

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

        // Kysely query - insert plus one guest
        plusOneGuest = await weddingDb
          .insertInto("guests", {
            first_name: plusOneFirstNameFinal,
            last_name: plusOneLastNameFinal,
            email: null, // Plus-ones don't have their own email
            invite_code: inviteCode, // Same invite code
            party_id: targetPartyId, // Same party as primary guest
            side: side || null,
            list: list || "a",
            is_plus_one: true,
            plus_one_allowed: false, // Plus ones themselves don't get plus ones
            primary_guest_id: guest.id,
            rsvp_status: "pending",
            number_of_resends: 0,
            mailing_address: null, // Plus-ones start with no contact info
            physical_invite_sent: false,
            phone_number: null,
            whatsapp: null,
            preferred_contact_method: null,
            family: family || false, // Inherit family status from primary guest
            under_21: under21 || false, // Inherit under_21 status from primary guest
            three_and_under: threeAndUnder || false, // Inherit three_and_under status from primary guest
            notes: null,
          })
          .returningAll()
          .executeTakeFirst();
      } catch (plusOneError) {
        console.error("Error creating plus one:", plusOneError);
        // Don't fail the entire request, just log it
      }
    }

    // Send email if requested
    if (shouldSendEmail && env.RSVP_EMAIL) {
      const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const rsvpUrl = `${appUrl}/rsvp?code=${inviteCode}`;

      // Fetch wedding date from the Wedding Ceremony event
      let weddingDate = "";
      try {
        const ceremonyEvent = await db
          .selectFrom("events")
          .where("wedding_id", "=", weddingId)
          .select(["event_date"])
          .where("name", "=", "Wedding Ceremony")
          .executeTakeFirst();

        if (ceremonyEvent?.event_date) {
          // event_date can be a Date object or string depending on the driver
          const dateValue = ceremonyEvent.event_date;
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
        await sendEmail({
          from: "Wedding Invitation <rsvp@helen-and-enrique.com>",
          to: email,
          subject: "You're Invited to Our Wedding! 💕",
          template: {
            id: WEDDING_INVITATION_TEMPLATE_ALIAS,
            variables: {
              FIRST_NAME: firstName,
              LAST_NAME: lastName || "",
              INVITE_CODE: inviteCode,
              RSVP_URL: rsvpUrl,
              APP_URL: appUrl,
              WEDDING_DATE: weddingDate,
            },
          },
        });

        // Update number_of_resends to 1 after successful email send
        await weddingDb
          .updateTable("guests")
          .set({ number_of_resends: 1 })
          .where("id", "=", guest.id)
          .execute();
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Guest ID is required" },
        { status: 400 },
      );
    }

    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);

    // Kysely query - delete guest by ID
    await weddingDb.deleteFrom("guests").where("id", "=", id).execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/guests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
