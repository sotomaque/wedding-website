import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getWeddingInvitationEmail } from "@/lib/email/templates/wedding-invitation";
import { generateInviteCode } from "@/lib/utils/invite-code";

/**
 * GET /api/admin/guests
 * Fetch all guests (admin only)
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

    // Kysely query - fetch all guests ordered by created_at
    const guests = await db
      .selectFrom("guests")
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
 * POST /api/admin/guests
 * Create a new guest and send invite email (admin only)
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
      sendEmail,
      mailingAddress,
      phoneNumber,
      whatsapp,
      preferredContactMethod,
      family,
      notes,
    } = body;

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 },
      );
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Kysely query - check if invite code exists
      const existing = await db
        .selectFrom("guests")
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

    // Kysely query - insert primary guest
    const guest = await db
      .insertInto("guests")
      .values({
        first_name: firstName,
        last_name: lastName || null,
        email: email || null,
        invite_code: inviteCode,
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
        notes: notes || null,
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
        plusOneGuest = await db
          .insertInto("guests")
          .values({
            first_name: plusOneFirstNameFinal,
            last_name: plusOneLastNameFinal,
            email: null, // Plus-ones don't have their own email
            invite_code: inviteCode, // Same invite code
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
    if (sendEmail && env.RESEND_API_KEY && env.RSVP_EMAIL) {
      const resend = new Resend(env.RESEND_API_KEY);
      const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const rsvpUrl = `${appUrl}/rsvp?code=${inviteCode}`;

      try {
        const emailHtml = getWeddingInvitationEmail({
          firstName,
          lastName,
          inviteCode,
          rsvpUrl,
          appUrl,
        });

        await resend.emails.send({
          from: "Wedding Invitation <onboarding@resend.dev>",
          to: email,
          subject: "You're Invited to Our Wedding! 💕",
          html: emailHtml,
        });

        // Update number_of_resends to 1 after successful email send
        await db
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
 * DELETE /api/admin/guests?id=xxx
 * Delete a guest (admin only)
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

    // Kysely query - delete guest by ID
    await db.deleteFrom("guests").where("id", "=", id).execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/guests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
