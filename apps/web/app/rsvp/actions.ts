"use server";

import type { Selectable } from "kysely";
import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { db } from "@/lib/db";
import type { GuestsTable } from "@/lib/db/types";
import { RSVP_NOTIFICATION_TEMPLATE_ALIAS } from "@/lib/email/constants";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import type { Database } from "@/lib/supabase/types";

type Guest = Database["public"]["Tables"]["guests"]["Row"];
type GuestRow = Selectable<GuestsTable>;

interface RSVPSubmitData {
  inviteCode: string;
  firstName: string;
  lastName?: string;
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
  under21?: boolean;
  threeAndUnder?: boolean;
  plusOneUnder21?: boolean;
  plusOneThreeAndUnder?: boolean;
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

    // First, find the party by invite code
    const party = await db
      .selectFrom("parties")
      .selectAll()
      .where("invite_code", "=", code.toUpperCase())
      .executeTakeFirst();

    if (!party) {
      // Fallback: check guests table directly for backwards compatibility
      const guestsByCode = await db
        .selectFrom("guests")
        .selectAll()
        .where("invite_code", "=", code.toUpperCase())
        .execute();

      if (!guestsByCode || guestsByCode.length === 0) {
        return { success: false, error: "Invalid invite code" };
      }

      // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
      return { success: true, guests: guestsByCode as any };
    }

    // Find all guests in this party
    const guests = await db
      .selectFrom("guests")
      .selectAll()
      .where("party_id", "=", party.id)
      .execute();

    if (!guests || guests.length === 0) {
      return { success: false, error: "No guests found for this party" };
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
      firstName,
      lastName,
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
      under21,
      threeAndUnder,
      plusOneUnder21,
      plusOneThreeAndUnder,
      mailingAddress,
      phoneNumber,
      whatsapp,
      preferredContactMethod,
    } = data;

    if (!inviteCode) {
      return { success: false, error: "Invite code is required" };
    }

    // First, find the party by invite code
    const party = await db
      .selectFrom("parties")
      .selectAll()
      .where("invite_code", "=", inviteCode.toUpperCase())
      .executeTakeFirst();

    let guests: GuestRow[];
    if (party) {
      // Get all guests in this party
      guests = await db
        .selectFrom("guests")
        .selectAll()
        .where("party_id", "=", party.id)
        .execute();
    } else {
      // Fallback: check guests table directly for backwards compatibility
      guests = await db
        .selectFrom("guests")
        .selectAll()
        .where("invite_code", "=", inviteCode.toUpperCase())
        .execute();
    }

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
        first_name: firstName,
        last_name: lastName || null,
        rsvp_status: attending ? "yes" : "no",
        dietary_restrictions: attending ? dietaryRestrictions || null : null,
        under_21: under21 ?? primaryGuest.under_21,
        three_and_under: threeAndUnder ?? primaryGuest.three_and_under,
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
                under_21: plusOneUnder21 ?? existingPlusOne.under_21,
                three_and_under:
                  plusOneThreeAndUnder ?? existingPlusOne.three_and_under,
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
                party_id: primaryGuest.party_id,
                side: primaryGuest.side,
                list: primaryGuest.list,
                is_plus_one: true,
                plus_one_allowed: false,
                primary_guest_id: primaryGuest.id,
                rsvp_status: "yes",
                dietary_restrictions: plusOneDietaryRestrictions || null,
                under_21: plusOneUnder21 ?? false,
                three_and_under: plusOneThreeAndUnder ?? false,
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
    if (getResendClient() && env.RSVP_EMAIL) {
      try {
        // Fetch updated guests for the notification email
        let updatedGuests: {
          first_name: string;
          last_name: string | null;
          email: string | null;
        }[];
        if (party) {
          updatedGuests = await db
            .selectFrom("guests")
            .select(["first_name", "last_name", "email"])
            .where("party_id", "=", party.id)
            .execute();
        } else {
          updatedGuests = await db
            .selectFrom("guests")
            .select(["first_name", "last_name", "email"])
            .where("invite_code", "=", inviteCode.toUpperCase())
            .execute();
        }

        const guestNames = updatedGuests
          .map((g) => `${g.first_name}${g.last_name ? ` ${g.last_name}` : ""}`)
          .join(", ");

        const guestEmails = updatedGuests
          .filter((g) => g.email)
          .map((g) => g.email)
          .join(", ");

        const recipients = env.RSVP_EMAIL.split(",").map((e) => e.trim());
        await sendEmail({
          from: "Wedding RSVP <rsvp@helen-and-enrique.com>",
          to: recipients,
          subject: `${attending ? "✅" : "❌"} RSVP: ${updatedGuests.map((g) => g.first_name).join(", ")} - ${attending ? "Attending" : "Not Attending"}`,
          template: {
            id: RSVP_NOTIFICATION_TEMPLATE_ALIAS,
            variables: {
              GUEST_NAMES: guestNames,
              GUEST_EMAILS: guestEmails || "No email provided",
              INVITE_CODE: inviteCode.toUpperCase(),
              STATUS_TEXT: attending ? "Attending" : "Not Attending",
              STATUS_EMOJI: attending ? "✅" : "❌",
              DIETARY_RESTRICTIONS: dietaryRestrictions || "None",
              GUEST_COUNT_TEXT:
                updatedGuests.length > 1
                  ? `${updatedGuests.length} guests`
                  : "1 guest",
              CONFIRMATION_TEXT: attending ? "confirmed" : "declined",
              SUBMITTED_AT: new Date().toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: "America/Los_Angeles",
              }),
            },
          },
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

/**
 * Link the current Clerk user to a guest record by invite code
 */
export async function linkClerkUserToGuestAction(
  inviteCode: string,
): Promise<{ success: boolean; error?: string }> {
  const { linkClerkUserToGuest } = await import("@/lib/auth/guest-session");
  const { currentUser } = await import("@clerk/nextjs/server");

  const user = await currentUser();
  if (!user) {
    return { success: false, error: "Not signed in" };
  }

  return linkClerkUserToGuest(user.id, inviteCode);
}

/**
 * Multi-guest RSVP submission data
 */
interface GuestRsvpSubmitData {
  guestId: string;
  firstName: string;
  lastName?: string;
  attending: boolean;
  dietaryRestrictions?: string;
  under21?: boolean;
  threeAndUnder?: boolean;
  plusOneAllowed: boolean;
  existingPlusOneId?: string;
  plusOneAttending?: boolean;
  plusOneFirstName?: string;
  plusOneLastName?: string;
  plusOneDietaryRestrictions?: string;
  plusOneUnder21?: boolean;
  plusOneThreeAndUnder?: boolean;
}

interface MultiGuestRSVPSubmitData {
  inviteCode: string;
  guests: GuestRsvpSubmitData[];
  mailingAddress?: string;
  phoneNumber?: string;
  whatsapp?: string;
  preferredContactMethod?: "email" | "text" | "whatsapp" | "phone_call" | null;
}

/**
 * Submit RSVP for multiple guests in a party
 */
export async function submitMultiGuestRSVP(
  data: MultiGuestRSVPSubmitData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      inviteCode,
      guests: guestRsvps,
      mailingAddress,
      phoneNumber,
      whatsapp,
      preferredContactMethod,
    } = data;

    if (!inviteCode) {
      return { success: false, error: "Invite code is required" };
    }

    if (!guestRsvps || guestRsvps.length === 0) {
      return { success: false, error: "At least one guest is required" };
    }

    // First, find the party by invite code
    const party = await db
      .selectFrom("parties")
      .selectAll()
      .where("invite_code", "=", inviteCode.toUpperCase())
      .executeTakeFirst();

    let partyGuests: GuestRow[];
    if (party) {
      partyGuests = await db
        .selectFrom("guests")
        .selectAll()
        .where("party_id", "=", party.id)
        .execute();
    } else {
      // Fallback: check guests table directly for backwards compatibility
      partyGuests = await db
        .selectFrom("guests")
        .selectAll()
        .where("invite_code", "=", inviteCode.toUpperCase())
        .execute();
    }

    if (!partyGuests || partyGuests.length === 0) {
      return { success: false, error: "Invalid invite code" };
    }

    // Process each guest's RSVP
    for (const guestRsvp of guestRsvps) {
      const existingGuest = partyGuests.find((g) => g.id === guestRsvp.guestId);
      if (!existingGuest) {
        console.warn(`Guest ${guestRsvp.guestId} not found in party`);
        continue;
      }

      // Update the guest record
      await db
        .updateTable("guests")
        .set({
          first_name: guestRsvp.firstName,
          last_name: guestRsvp.lastName || null,
          rsvp_status: guestRsvp.attending ? "yes" : "no",
          dietary_restrictions: guestRsvp.attending
            ? guestRsvp.dietaryRestrictions || null
            : null,
          under_21: guestRsvp.under21 ?? existingGuest.under_21,
          three_and_under:
            guestRsvp.threeAndUnder ?? existingGuest.three_and_under,
          // Update contact info from shared party-level data
          mailing_address: mailingAddress || existingGuest.mailing_address,
          phone_number: phoneNumber || existingGuest.phone_number,
          whatsapp: whatsapp || existingGuest.whatsapp,
          preferred_contact_method:
            preferredContactMethod || existingGuest.preferred_contact_method,
        })
        .where("id", "=", guestRsvp.guestId)
        .execute();

      // Handle plus-one for this guest
      if (guestRsvp.plusOneAllowed) {
        const existingPlusOne = guestRsvp.existingPlusOneId
          ? partyGuests.find((g) => g.id === guestRsvp.existingPlusOneId)
          : partyGuests.find(
              (g) => g.is_plus_one && g.primary_guest_id === guestRsvp.guestId,
            );

        // If primary guest is not attending, mark plus-one as not attending
        if (!guestRsvp.attending) {
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
        } else if (
          guestRsvp.plusOneAttending &&
          guestRsvp.plusOneFirstName?.trim()
        ) {
          // Plus-one is attending with a name
          if (existingPlusOne) {
            // Update existing plus-one
            await db
              .updateTable("guests")
              .set({
                first_name: guestRsvp.plusOneFirstName,
                last_name: guestRsvp.plusOneLastName || null,
                rsvp_status: "yes",
                dietary_restrictions:
                  guestRsvp.plusOneDietaryRestrictions || null,
                under_21: guestRsvp.plusOneUnder21 ?? existingPlusOne.under_21,
                three_and_under:
                  guestRsvp.plusOneThreeAndUnder ??
                  existingPlusOne.three_and_under,
              })
              .where("id", "=", existingPlusOne.id)
              .execute();
          } else {
            // Create new plus-one
            await db
              .insertInto("guests")
              .values({
                first_name: guestRsvp.plusOneFirstName,
                last_name: guestRsvp.plusOneLastName || null,
                email: existingGuest.email,
                invite_code: existingGuest.invite_code,
                party_id: existingGuest.party_id,
                side: existingGuest.side,
                list: existingGuest.list,
                is_plus_one: true,
                plus_one_allowed: false,
                primary_guest_id: existingGuest.id,
                rsvp_status: "yes",
                dietary_restrictions:
                  guestRsvp.plusOneDietaryRestrictions || null,
                under_21: guestRsvp.plusOneUnder21 ?? false,
                three_and_under: guestRsvp.plusOneThreeAndUnder ?? false,
                mailing_address: mailingAddress || null,
                phone_number: phoneNumber || null,
                whatsapp: whatsapp || null,
                preferred_contact_method: preferredContactMethod || null,
                number_of_resends: 0,
                physical_invite_sent: false,
                family: existingGuest.family,
              })
              .execute();
          }
        } else if (existingPlusOne && guestRsvp.plusOneAttending === false) {
          // Plus-one is explicitly not attending
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
    }

    // Send notification email to admin
    if (getResendClient() && env.RSVP_EMAIL) {
      try {
        // Fetch updated guests for the notification email
        let updatedGuests: {
          first_name: string;
          last_name: string | null;
          email: string | null;
          rsvp_status: string | null;
        }[];
        if (party) {
          updatedGuests = await db
            .selectFrom("guests")
            .select(["first_name", "last_name", "email", "rsvp_status"])
            .where("party_id", "=", party.id)
            .execute();
        } else {
          updatedGuests = await db
            .selectFrom("guests")
            .select(["first_name", "last_name", "email", "rsvp_status"])
            .where("invite_code", "=", inviteCode.toUpperCase())
            .execute();
        }

        const attendingGuests = updatedGuests.filter(
          (g) => g.rsvp_status === "yes",
        );
        const decliningGuests = updatedGuests.filter(
          (g) => g.rsvp_status === "no",
        );

        const guestNames = updatedGuests
          .map((g) => `${g.first_name}${g.last_name ? ` ${g.last_name}` : ""}`)
          .join(", ");

        const guestEmails = updatedGuests
          .filter((g) => g.email)
          .map((g) => g.email)
          .join(", ");

        // Build status text
        const attendingNames = attendingGuests
          .map((g) => g.first_name)
          .join(", ");
        const decliningNames = decliningGuests
          .map((g) => g.first_name)
          .join(", ");
        const anyAttending = attendingGuests.length > 0;

        const recipients = env.RSVP_EMAIL.split(",").map((e) => e.trim());
        await sendEmail({
          from: "Wedding RSVP <rsvp@helen-and-enrique.com>",
          to: recipients,
          subject: `${anyAttending ? "✅" : "❌"} RSVP: ${inviteCode.toUpperCase()} - ${attendingGuests.length} attending, ${decliningGuests.length} declined`,
          template: {
            id: RSVP_NOTIFICATION_TEMPLATE_ALIAS,
            variables: {
              GUEST_NAMES: guestNames,
              GUEST_EMAILS: guestEmails || "No email provided",
              INVITE_CODE: inviteCode.toUpperCase(),
              STATUS_TEXT: `${attendingNames || "None"} attending${decliningNames ? `, ${decliningNames} declined` : ""}`,
              STATUS_EMOJI: anyAttending ? "✅" : "❌",
              DIETARY_RESTRICTIONS:
                guestRsvps
                  .filter((g) => g.dietaryRestrictions)
                  .map((g) => `${g.firstName}: ${g.dietaryRestrictions}`)
                  .join("; ") || "None",
              GUEST_COUNT_TEXT: `${attendingGuests.length} attending, ${decliningGuests.length} declined`,
              CONFIRMATION_TEXT: anyAttending ? "confirmed" : "declined",
              SUBMITTED_AT: new Date().toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: "America/Los_Angeles",
              }),
            },
          },
        });
      } catch (emailError) {
        console.error("Error sending RSVP notification email:", emailError);
      }
    }

    revalidatePath("/rsvp");
    return { success: true };
  } catch (error) {
    console.error("Error submitting multi-guest RSVP:", error);
    return { success: false, error: "Failed to submit RSVP" };
  }
}
