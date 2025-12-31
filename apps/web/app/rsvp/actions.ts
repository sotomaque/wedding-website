"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/lib/db";
import { getRsvpNotificationEmail } from "@/lib/email/templates/rsvp-notification";
import type { Database } from "@/lib/supabase/types";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

interface RSVPSubmitData {
  inviteCode: string;
  attending: boolean;
  plusOneAttending?: boolean;
  plusOneFirstName?: string;
  plusOneLastName?: string;
  plusOneEmail?: string;
  plusOnePhoneNumber?: string;
  plusOneWhatsapp?: string;
  plusOnePreferredContactMethod?:
    | "email"
    | "text"
    | "whatsapp"
    | "phone_call"
    | null;
  plusOneDietaryRestrictions?: string;
  dietaryRestrictions?: string;
  mailingAddress?: string;
  phoneNumber?: string;
  whatsapp?: string;
  preferredContactMethod?: "email" | "text" | "whatsapp" | "phone_call" | null;
}

/**
 * Verify an invite code and return associated guests
 */
export async function verifyInviteCode(code: string): Promise<{
  success: boolean;
  guests?: Guest[];
  error?: string;
}> {
  try {
    if (!code) {
      return { success: false, error: "Invite code is required" };
    }

    // Find all guests with this invite code
    const guests = await db
      .selectFrom("guests")
      .selectAll()
      .where("invite_code", "=", code.toUpperCase())
      .execute();

    if (!guests || guests.length === 0) {
      return { success: false, error: "Invalid invite code" };
    }

    // Kysely returns Date objects which get serialized to strings when sent to client
    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return { success: true, guests: guests as any };
  } catch (error) {
    console.error("Error verifying invite code:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Submit RSVP with proper plus-one handling
 */
export async function submitRSVP(data: RSVPSubmitData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const {
      inviteCode,
      attending,
      plusOneAttending,
      plusOneFirstName,
      plusOneLastName,
      plusOneEmail,
      plusOnePhoneNumber,
      plusOneWhatsapp,
      plusOnePreferredContactMethod,
      plusOneDietaryRestrictions,
      dietaryRestrictions,
      mailingAddress,
      phoneNumber,
      whatsapp,
      preferredContactMethod,
    } = data;

    if (!inviteCode) {
      return { success: false, error: "Invite code is required" };
    }

    // Get all guests with this invite code
    const guests = await db
      .selectFrom("guests")
      .selectAll()
      .where("invite_code", "=", inviteCode.toUpperCase())
      .execute();

    if (!guests || guests.length === 0) {
      return { success: false, error: "Invalid invite code" };
    }

    // Find primary guest and existing plus-one
    const primaryGuest = guests.find((g) => !g.is_plus_one);
    const existingPlusOne = guests.find((g) => g.is_plus_one);

    if (!primaryGuest) {
      return { success: false, error: "Primary guest not found" };
    }

    // Update primary guest
    await db
      .updateTable("guests")
      .set({
        rsvp_status: attending ? "yes" : "no",
        dietary_restrictions: attending ? dietaryRestrictions || null : null,
        mailing_address: mailingAddress || null,
        phone_number: phoneNumber || null,
        whatsapp: whatsapp || null,
        preferred_contact_method: preferredContactMethod || null,
      })
      .where("id", "=", primaryGuest.id)
      .execute();

    // Handle plus-one scenarios
    if (primaryGuest.plus_one_allowed) {
      // Scenario 1: Primary guest is not attending - mark plus-one as not attending
      if (!attending) {
        if (existingPlusOne) {
          await db
            .updateTable("guests")
            .set({
              rsvp_status: "no",
              dietary_restrictions: null,
            })
            .where("id", "=", existingPlusOne.id)
            .execute();
        }
      }
      // Scenario 2: Primary guest is attending
      else {
        // Scenario 2a: Plus-one is attending and we have a first name
        if (plusOneAttending && plusOneFirstName && plusOneFirstName.trim()) {
          if (existingPlusOne) {
            // Update existing plus-one
            await db
              .updateTable("guests")
              .set({
                first_name: plusOneFirstName,
                last_name: plusOneLastName || null,
                email: plusOneEmail || existingPlusOne.email,
                rsvp_status: "yes",
                dietary_restrictions: plusOneDietaryRestrictions || null,
                phone_number: plusOnePhoneNumber || null,
                whatsapp: plusOneWhatsapp || null,
                preferred_contact_method: plusOnePreferredContactMethod || null,
              })
              .where("id", "=", existingPlusOne.id)
              .execute();
          } else {
            // Create new plus-one record
            await db
              .insertInto("guests")
              .values({
                first_name: plusOneFirstName,
                last_name: plusOneLastName || null,
                email: plusOneEmail || primaryGuest.email,
                invite_code: primaryGuest.invite_code,
                side: primaryGuest.side,
                list: primaryGuest.list,
                is_plus_one: true,
                plus_one_allowed: false,
                primary_guest_id: primaryGuest.id,
                rsvp_status: "yes",
                dietary_restrictions: plusOneDietaryRestrictions || null,
                mailing_address: mailingAddress || null,
                phone_number: plusOnePhoneNumber || null,
                whatsapp: plusOneWhatsapp || null,
                preferred_contact_method: plusOnePreferredContactMethod || null,
                number_of_resends: 0,
                physical_invite_sent: false,
                family: primaryGuest.family,
              })
              .execute();
          }
        }
        // Scenario 2b: Plus-one is not attending or no name provided
        else if (existingPlusOne && plusOneAttending === false) {
          // Mark existing plus-one as not attending
          await db
            .updateTable("guests")
            .set({
              rsvp_status: "no",
              dietary_restrictions: null,
            })
            .where("id", "=", existingPlusOne.id)
            .execute();
        }
        // Scenario 2c: Plus-one status unknown - keep existing plus-one unchanged
      }
    }

    // Send notification email to admin
    if (env.RESEND_API_KEY && env.RSVP_EMAIL) {
      try {
        // Fetch updated guests for the notification email
        const updatedGuests = await db
          .selectFrom("guests")
          .select(["first_name", "last_name", "email"])
          .where("invite_code", "=", inviteCode.toUpperCase())
          .execute();

        const resend = new Resend(env.RESEND_API_KEY);
        const emailHtml = getRsvpNotificationEmail({
          guests: updatedGuests.map((g) => ({
            firstName: g.first_name,
            lastName: g.last_name,
            email: g.email,
          })),
          inviteCode: inviteCode.toUpperCase(),
          attending,
          dietaryRestrictions,
          submittedAt: new Date().toLocaleString("en-US", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "America/Los_Angeles",
          }),
        });

        await resend.emails.send({
          from: "Wedding RSVP <rsvp@helen-and-enrique.com>",
          to: env.RSVP_EMAIL,
          subject: `${attending ? "✅" : "❌"} RSVP: ${updatedGuests.map((g) => g.first_name).join(", ")} - ${attending ? "Attending" : "Not Attending"}`,
          html: emailHtml,
        });
      } catch (emailError) {
        // Log but don't fail the RSVP submission if email fails
        console.error("Error sending RSVP notification email:", emailError);
      }
    }

    revalidatePath("/rsvp");
    return { success: true };
  } catch (error) {
    console.error("Error submitting RSVP:", error);
    return { success: false, error: "Failed to submit RSVP" };
  }
}
