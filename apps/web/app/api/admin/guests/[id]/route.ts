import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

/**
 * GET /api/admin/guests/[id]
 * Get a guest and their plus-one if they have one (admin only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    // Fetch the guest
    const guest = await db
      .selectFrom("guests")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Fetch plus-one if exists
    const plusOne = await db
      .selectFrom("guests")
      .selectAll()
      .where("primary_guest_id", "=", id)
      .where("is_plus_one", "=", true)
      .executeTakeFirst();

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
 * PATCH /api/admin/guests/[id]
 * Update a guest (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
      notes,
    } = body;

    // Kysely query - fetch the current guest to check if they have a plus one
    const currentGuest = await db
      .selectFrom("guests")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!currentGuest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Update the primary guest
    const updatedGuest = await db
      .updateTable("guests")
      .set({
        first_name: firstName || currentGuest.first_name,
        last_name:
          lastName !== undefined ? lastName || null : currentGuest.last_name,
        email: email || null,
        side: side !== undefined ? side : currentGuest.side,
        list: list || currentGuest.list,
        plus_one_allowed: plusOneAllowed || false,
        mailing_address:
          mailingAddress !== undefined
            ? mailingAddress || null
            : currentGuest.mailing_address,
        physical_invite_sent:
          physicalInviteSent !== undefined
            ? physicalInviteSent
            : currentGuest.physical_invite_sent,
        phone_number:
          phoneNumber !== undefined
            ? phoneNumber || null
            : currentGuest.phone_number,
        whatsapp:
          whatsapp !== undefined ? whatsapp || null : currentGuest.whatsapp,
        preferred_contact_method:
          preferredContactMethod !== undefined
            ? preferredContactMethod || null
            : currentGuest.preferred_contact_method,
        family: family !== undefined ? family : currentGuest.family,
        notes: notes !== undefined ? notes || null : currentGuest.notes,
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    // Handle plus one logic
    if (plusOneAllowed) {
      // Check if plus one already exists
      const existingPlusOne = await db
        .selectFrom("guests")
        .selectAll()
        .where("primary_guest_id", "=", id)
        .where("is_plus_one", "=", true)
        .executeTakeFirst();

      // Determine plus-one name: use provided name or create placeholder
      const primaryFullName =
        `${updatedGuest?.first_name || currentGuest.first_name}${
          updatedGuest?.last_name || currentGuest.last_name
            ? ` ${updatedGuest?.last_name || currentGuest.last_name}`
            : ""
        }`.trim();
      const plusOneFirstNameFinal = plusOneFirstName?.trim() || primaryFullName;
      const plusOneLastNameFinal = plusOneFirstName?.trim()
        ? plusOneLastName || null
        : "- Plus One";

      if (existingPlusOne) {
        // Update existing plus one
        // Note: list and family are automatically cascaded by database trigger
        await db
          .updateTable("guests")
          .set({
            first_name: plusOneFirstNameFinal,
            last_name: plusOneLastNameFinal,
            side: side !== undefined ? side : currentGuest.side,
          })
          .where("id", "=", existingPlusOne.id)
          .execute();
      } else {
        // Create new plus one
        // Note: list and family will be automatically set by database trigger on first update
        // For initial creation, we set them explicitly since trigger only runs on UPDATE
        await db
          .insertInto("guests")
          .values({
            first_name: plusOneFirstNameFinal,
            last_name: plusOneLastNameFinal,
            email: null, // Plus-ones don't have their own email
            invite_code: currentGuest.invite_code,
            side: side !== undefined ? side : currentGuest.side,
            list: list || currentGuest.list,
            is_plus_one: true,
            plus_one_allowed: false, // Plus ones themselves don't get plus ones
            primary_guest_id: id,
            rsvp_status: "pending",
            number_of_resends: 0,
            physical_invite_sent: false,
            family: family !== undefined ? family : currentGuest.family,
          })
          .execute();
      }
    } else {
      // Remove plus one if it exists and plusOneAllowed is false
      await db
        .deleteFrom("guests")
        .where("primary_guest_id", "=", id)
        .where("is_plus_one", "=", true)
        .execute();
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
