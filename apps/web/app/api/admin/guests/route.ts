import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";
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
      const rsvpUrl = `${env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/rsvp?code=${inviteCode}`;

      try {
        await resend.emails.send({
          from: "Wedding Invitation <onboarding@resend.dev>",
          to: email,
          subject: "You're Invited to Our Wedding! 💕",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Wedding Invitation</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 60px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">
                      You're Invited!
                    </h1>
                    <p style="margin: 15px 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 300;">
                      Join us in celebrating our special day
                    </p>
                  </div>

                  <!-- Content -->
                  <div style="padding: 50px 40px;">
                    <p style="margin: 0 0 25px; color: #1a1a1a; font-size: 16px; line-height: 1.6;">
                      Dear ${firstName}${lastName ? ` ${lastName}` : ""},
                    </p>

                    <p style="margin: 0 0 30px; color: #1a1a1a; font-size: 16px; line-height: 1.6;">
                      We're thrilled to invite you to our wedding celebration! Your presence would mean the world to us as we begin this new chapter together.
                    </p>

                    <!-- RSVP Box -->
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #667eea; padding: 25px; margin: 30px 0; border-radius: 4px;">
                      <p style="margin: 0 0 12px; color: #495057; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Your Invitation Code
                      </p>
                      <p style="margin: 0 0 20px;">
                        <span style="display: inline-block; background: #ffffff; padding: 12px 20px; border-radius: 6px; font-size: 24px; font-weight: 700; color: #667eea; letter-spacing: 2px; font-family: 'Courier New', monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                          ${inviteCode}
                        </span>
                      </p>
                      <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.5;">
                        Use this code to RSVP and let us know if you'll be joining us.
                      </p>
                    </div>

                    <!-- RSVP Button -->
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${rsvpUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                        RSVP Now
                      </a>
                    </div>

                    <p style="margin: 30px 0 0; color: #6c757d; font-size: 14px; line-height: 1.6; text-align: center;">
                      Can't click the button? Copy and paste this link into your browser:<br>
                      <a href="${rsvpUrl}" style="color: #667eea; text-decoration: none; word-break: break-all;">${rsvpUrl}</a>
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0 0 10px; color: #1a1a1a; font-size: 16px; font-weight: 500;">
                      We can't wait to celebrate with you! 💕
                    </p>
                    <p style="margin: 0; color: #6c757d; font-size: 13px;">
                      If you have any questions, please don't hesitate to reach out.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });
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
