"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { generateIcs } from "@/lib/calendar/generate-ics";
import { db } from "@/lib/db";
import { RSVP_NOTIFICATION_TEMPLATE_ALIAS } from "@/lib/email/constants";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { multiGuestRsvpSchema } from "@/lib/validations/rsvp";

// ---------------------------------------------------------------------------
// Narrowed guest type — only the columns the RSVP client needs.
// Exported so RSVPFormView / RSVPForm / GuestRsvpCard can import it as a type.
// ---------------------------------------------------------------------------
export interface RsvpGuest {
  id: string;
  first_name: string;
  last_name: string | null;
  rsvp_status: string | null;
  is_plus_one: boolean | null;
  plus_one_allowed: boolean | null;
  primary_guest_id: string | null;
  dietary_restrictions: string | null;
  under_21: boolean | null;
  three_and_under: boolean | null;
  mailing_address: string | null;
  phone_number: string | null;
  whatsapp: string | null;
  preferred_contact_method: string | null;
  arrival_date: string | null;
  arrival_transport: string | null;
  departure_date: string | null;
  departure_transport: string | null;
  accommodation_notes: string | null;
}

// Columns sent to the client
const RSVP_GUEST_COLUMNS = [
  "id",
  "first_name",
  "last_name",
  "rsvp_status",
  "is_plus_one",
  "plus_one_allowed",
  "primary_guest_id",
  "dietary_restrictions",
  "under_21",
  "three_and_under",
  "mailing_address",
  "phone_number",
  "whatsapp",
  "preferred_contact_method",
  "arrival_date",
  "arrival_transport",
  "departure_date",
  "departure_transport",
  "accommodation_notes",
] as const;

// Superset needed internally for insert/update logic (not sent to client)
const PARTY_GUEST_COLUMNS = [
  ...RSVP_GUEST_COLUMNS,
  "email",
  "invite_code",
  "party_id",
  "side",
  "list",
  "family",
] as const;

// ---------------------------------------------------------------------------
// verifyInviteCode
// ---------------------------------------------------------------------------
export async function verifyInviteCode(code: string): Promise<{
  success: boolean;
  guests?: RsvpGuest[];
  error?: string;
}> {
  try {
    if (!code) {
      return { success: false, error: "Invite code is required" };
    }

    const party = await db
      .selectFrom("parties")
      .select(["id", "invite_code"])
      .where("invite_code", "=", code.toUpperCase())
      .executeTakeFirst();

    if (!party) {
      // Fallback: check guests table directly for backwards compatibility
      const guestsByCode = await db
        .selectFrom("guests")
        .select(RSVP_GUEST_COLUMNS)
        .where("invite_code", "=", code.toUpperCase())
        .execute();

      if (!guestsByCode || guestsByCode.length === 0) {
        return { success: false, error: "Invalid invite code" };
      }

      return { success: true, guests: guestsByCode as RsvpGuest[] };
    }

    const guests = await db
      .selectFrom("guests")
      .select(RSVP_GUEST_COLUMNS)
      .where("party_id", "=", party.id)
      .execute();

    if (!guests || guests.length === 0) {
      return { success: false, error: "No guests found for this party" };
    }

    return { success: true, guests: guests as RsvpGuest[] };
  } catch (error) {
    console.error("Error verifying invite code:", error);
    return { success: false, error: "Internal server error" };
  }
}

// ---------------------------------------------------------------------------
// submitRSVP (legacy single-guest action)
// ---------------------------------------------------------------------------
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

    const party = await db
      .selectFrom("parties")
      .select(["id", "invite_code"])
      .where("invite_code", "=", inviteCode.toUpperCase())
      .executeTakeFirst();

    const guestsQuery = party
      ? db
          .selectFrom("guests")
          .select(PARTY_GUEST_COLUMNS)
          .where("party_id", "=", party.id)
      : db
          .selectFrom("guests")
          .select(PARTY_GUEST_COLUMNS)
          .where("invite_code", "=", inviteCode.toUpperCase());

    const guests = await guestsQuery.execute();

    if (!guests || guests.length === 0) {
      return { success: false, error: "Invalid invite code" };
    }

    const primaryGuest = guests.find((g) => !g.is_plus_one);
    const existingPlusOne = guests.find((g) => g.is_plus_one);

    if (!primaryGuest) {
      return { success: false, error: "Primary guest not found" };
    }

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

    if (primaryGuest.plus_one_allowed) {
      if (!attending) {
        if (existingPlusOne) {
          await db
            .updateTable("guests")
            .set({ rsvp_status: "no", dietary_restrictions: null })
            .where("id", "=", existingPlusOne.id)
            .execute();
        }
      } else if (plusOneAttending && plusOneFirstName?.trim()) {
        if (existingPlusOne) {
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
      } else if (existingPlusOne && plusOneAttending === false) {
        await db
          .updateTable("guests")
          .set({ rsvp_status: "no", dietary_restrictions: null })
          .where("id", "=", existingPlusOne.id)
          .execute();
      }
    }

    // Fire-and-forget: send notification email after response
    const rsvpEmail = env.RSVP_EMAIL;
    if (getResendClient() && rsvpEmail) {
      const capturedParty = party;
      const capturedInviteCode = inviteCode;
      const capturedAttending = attending;
      const capturedDietary = dietaryRestrictions;
      after(async () => {
        try {
          const updatedGuests = await db
            .selectFrom("guests")
            .select(["id", "first_name", "last_name", "email", "rsvp_status"])
            .where(
              capturedParty ? "party_id" : "invite_code",
              "=",
              capturedParty
                ? capturedParty.id
                : capturedInviteCode.toUpperCase(),
            )
            .execute();

          const guestNames = updatedGuests
            .map(
              (g) => `${g.first_name}${g.last_name ? ` ${g.last_name}` : ""}`,
            )
            .join(", ");
          const guestEmails = updatedGuests
            .filter((g) => g.email)
            .map((g) => g.email)
            .join(", ");

          const recipients = rsvpEmail.split(",").map((e) => e.trim());
          await sendEmail({
            from: "Wedding RSVP <rsvp@helen-and-enrique.com>",
            to: recipients,
            template: {
              id: RSVP_NOTIFICATION_TEMPLATE_ALIAS,
              variables: {
                GUEST_NAMES: guestNames,
                GUEST_EMAILS: guestEmails || "No email provided",
                INVITE_CODE: capturedInviteCode.toUpperCase(),
                STATUS_TEXT: capturedAttending ? "Attending" : "Not Attending",
                STATUS_EMOJI: capturedAttending ? "✅" : "❌",
                DIETARY_RESTRICTIONS: capturedDietary || "None",
                GUEST_COUNT_TEXT:
                  updatedGuests.length > 1
                    ? `${updatedGuests.length} guests`
                    : "1 guest",
                CONFIRMATION_TEXT: capturedAttending ? "confirmed" : "declined",
                SUBMITTED_AT: new Date().toLocaleString("en-US", {
                  dateStyle: "full",
                  timeStyle: "short",
                  timeZone: "America/Los_Angeles",
                }),
              },
            },
          });

          // Send calendar invites to attending guests with an email address
          const attendingWithEmail = updatedGuests.filter(
            (g) => g.rsvp_status === "yes" && g.email?.includes("@"),
          );
          if (attendingWithEmail.length > 0) {
            const defaultEvents = await db
              .selectFrom("events")
              .select([
                "id",
                "name",
                "event_date",
                "start_time",
                "end_time",
                "location_name",
                "location_address",
              ])
              .where("is_default", "=", true)
              .orderBy("display_order", "asc")
              .execute();

            if (defaultEvents.length > 0) {
              const eventsForIcs = defaultEvents.map((e) => ({
                ...e,
                event_date:
                  e.event_date instanceof Date
                    ? e.event_date
                    : e.event_date
                      ? new Date(`${e.event_date}T00:00:00`)
                      : null,
              }));

              const eventLines = defaultEvents
                .map((e) => {
                  const dateStr = e.event_date
                    ? new Date(`${e.event_date}T00:00:00`).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                    : "";
                  const timeStr = e.start_time
                    ? ` at ${e.start_time}${e.end_time ? ` – ${e.end_time}` : ""}`
                    : "";
                  const locationStr = e.location_name
                    ? `<br/><small>${e.location_name}${e.location_address ? `, ${e.location_address}` : ""}</small>`
                    : "";
                  return `<li><strong>${e.name}</strong> — ${dateStr}${timeStr}${locationStr}</li>`;
                })
                .join("");

              for (const guest of attendingWithEmail) {
                try {
                  const guestName = `${guest.first_name}${guest.last_name ? ` ${guest.last_name}` : ""}`;
                  const icsContent = generateIcs(eventsForIcs, guestName);
                  const html = `
                    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2d2d2d;">
                      <h2 style="font-weight: normal; color: #7c6a5e;">Your Calendar Invite 💕</h2>
                      <p>Hi ${guest.first_name},</p>
                      <p>We're so excited to celebrate with you! Please find attached a calendar invite for our wedding events.</p>
                      <ul style="line-height: 2;">${eventLines}</ul>
                      <p>Open the attached <strong>.ics file</strong> to add these events to your calendar.</p>
                      <p>With love,<br/>Helen &amp; Enrique</p>
                    </div>
                  `.trim();

                  await sendEmail({
                    from: "Helen & Enrique <rsvp@helen-and-enrique.com>",
                    to: guest.email as string,
                    subject:
                      "Your Calendar Invite — Helen & Enrique's Wedding 💕",
                    html,
                    attachments: [
                      {
                        filename: "helen-and-enrique-wedding.ics",
                        content: Buffer.from(icsContent).toString("base64"),
                      },
                    ],
                  });

                  await db
                    .updateTable("guests")
                    .set({
                      calendar_invite_sent: true,
                      calendar_invite_sent_at: new Date().toISOString(),
                    })
                    .where("id", "=", guest.id)
                    .execute();
                } catch (calendarError) {
                  console.error(
                    `Error sending calendar invite to guest ${guest.id}:`,
                    calendarError,
                  );
                }
              }
            }
          }
        } catch (emailError) {
          console.error("Error sending RSVP notification email:", emailError);
        }
      });
    }

    revalidatePath("/rsvp");
    return { success: true };
  } catch (error) {
    console.error("Error submitting RSVP:", error);
    return { success: false, error: "Failed to submit RSVP" };
  }
}

// ---------------------------------------------------------------------------
// linkClerkUserToGuestAction
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// submitMultiGuestRSVP
// ---------------------------------------------------------------------------
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
  arrivalDate?: string;
  arrivalTransport?: string;
  departureDate?: string;
  departureTransport?: string;
  accommodationNotes?: string;
}

// Server-side schema extends the form schema with inviteCode
const submitMultiGuestSchema = multiGuestRsvpSchema.extend({
  inviteCode: z.string().min(1, "Invite code is required"),
});

export async function submitMultiGuestRSVP(
  data: MultiGuestRSVPSubmitData,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Runtime validation
    const parsed = submitMultiGuestSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const {
      inviteCode,
      guests: guestRsvps,
      mailingAddress,
      phoneNumber,
      whatsapp,
      preferredContactMethod,
      arrivalDate,
      arrivalTransport,
      departureDate,
      departureTransport,
      accommodationNotes,
    } = parsed.data;

    const party = await db
      .selectFrom("parties")
      .select(["id", "invite_code"])
      .where("invite_code", "=", inviteCode.toUpperCase())
      .executeTakeFirst();

    const partyGuests = party
      ? await db
          .selectFrom("guests")
          .select(PARTY_GUEST_COLUMNS)
          .where("party_id", "=", party.id)
          .execute()
      : await db
          .selectFrom("guests")
          .select(PARTY_GUEST_COLUMNS)
          .where("invite_code", "=", inviteCode.toUpperCase())
          .execute();

    if (!partyGuests || partyGuests.length === 0) {
      return { success: false, error: "Invalid invite code" };
    }

    // Process all guests in parallel — rows are independent
    await Promise.all(
      guestRsvps.map(async (guestRsvp) => {
        const existingGuest = partyGuests.find(
          (g) => g.id === guestRsvp.guestId,
        );
        if (!existingGuest) {
          console.warn(`Guest ${guestRsvp.guestId} not found in party`);
          return;
        }

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
            mailing_address: mailingAddress || existingGuest.mailing_address,
            phone_number: phoneNumber || existingGuest.phone_number,
            whatsapp: whatsapp || existingGuest.whatsapp,
            preferred_contact_method:
              preferredContactMethod || existingGuest.preferred_contact_method,
            arrival_date: arrivalDate || existingGuest.arrival_date,
            arrival_transport:
              arrivalTransport || existingGuest.arrival_transport,
            departure_date: departureDate || existingGuest.departure_date,
            departure_transport:
              departureTransport || existingGuest.departure_transport,
            accommodation_notes:
              accommodationNotes || existingGuest.accommodation_notes,
          })
          .where("id", "=", guestRsvp.guestId)
          .execute();

        if (guestRsvp.plusOneAllowed) {
          const existingPlusOne = guestRsvp.existingPlusOneId
            ? partyGuests.find((g) => g.id === guestRsvp.existingPlusOneId)
            : partyGuests.find(
                (g) =>
                  g.is_plus_one && g.primary_guest_id === guestRsvp.guestId,
              );

          if (!guestRsvp.attending) {
            if (existingPlusOne) {
              await db
                .updateTable("guests")
                .set({ rsvp_status: "no", dietary_restrictions: null })
                .where("id", "=", existingPlusOne.id)
                .execute();
            }
          } else if (
            guestRsvp.plusOneAttending &&
            guestRsvp.plusOneFirstName?.trim()
          ) {
            if (existingPlusOne) {
              await db
                .updateTable("guests")
                .set({
                  first_name: guestRsvp.plusOneFirstName,
                  last_name: guestRsvp.plusOneLastName || null,
                  rsvp_status: "yes",
                  dietary_restrictions:
                    guestRsvp.plusOneDietaryRestrictions || null,
                  under_21:
                    guestRsvp.plusOneUnder21 ?? existingPlusOne.under_21,
                  three_and_under:
                    guestRsvp.plusOneThreeAndUnder ??
                    existingPlusOne.three_and_under,
                })
                .where("id", "=", existingPlusOne.id)
                .execute();
            } else {
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
            await db
              .updateTable("guests")
              .set({ rsvp_status: "no", dietary_restrictions: null })
              .where("id", "=", existingPlusOne.id)
              .execute();
          }
        }
      }),
    );

    // Fire-and-forget: send notification email after response
    const rsvpEmailMulti = env.RSVP_EMAIL;
    if (getResendClient() && rsvpEmailMulti) {
      const capturedParty = party;
      const capturedInviteCode = inviteCode;
      const capturedGuestRsvps = guestRsvps;
      after(async () => {
        try {
          const updatedGuests = await db
            .selectFrom("guests")
            .select(["id", "first_name", "last_name", "email", "rsvp_status"])
            .where(
              capturedParty ? "party_id" : "invite_code",
              "=",
              capturedParty
                ? capturedParty.id
                : capturedInviteCode.toUpperCase(),
            )
            .execute();

          const attendingGuests = updatedGuests.filter(
            (g) => g.rsvp_status === "yes",
          );
          const decliningGuests = updatedGuests.filter(
            (g) => g.rsvp_status === "no",
          );
          const guestNames = updatedGuests
            .map(
              (g) => `${g.first_name}${g.last_name ? ` ${g.last_name}` : ""}`,
            )
            .join(", ");
          const guestEmails = updatedGuests
            .filter((g) => g.email)
            .map((g) => g.email)
            .join(", ");
          const attendingNames = attendingGuests
            .map((g) => g.first_name)
            .join(", ");
          const decliningNames = decliningGuests
            .map((g) => g.first_name)
            .join(", ");
          const anyAttending = attendingGuests.length > 0;

          const recipients = rsvpEmailMulti.split(",").map((e) => e.trim());
          await sendEmail({
            from: "Wedding RSVP <rsvp@helen-and-enrique.com>",
            to: recipients,
            template: {
              id: RSVP_NOTIFICATION_TEMPLATE_ALIAS,
              variables: {
                GUEST_NAMES: guestNames,
                GUEST_EMAILS: guestEmails || "No email provided",
                INVITE_CODE: capturedInviteCode.toUpperCase(),
                STATUS_TEXT: `${attendingNames || "None"} attending${decliningNames ? `, ${decliningNames} declined` : ""}`,
                STATUS_EMOJI: anyAttending ? "✅" : "❌",
                DIETARY_RESTRICTIONS:
                  capturedGuestRsvps
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
          // Send calendar invites to attending guests with an email address
          const attendingWithEmailMulti = updatedGuests.filter(
            (g) => g.rsvp_status === "yes" && g.email?.includes("@"),
          );
          if (attendingWithEmailMulti.length > 0) {
            const defaultEvents = await db
              .selectFrom("events")
              .select([
                "id",
                "name",
                "event_date",
                "start_time",
                "end_time",
                "location_name",
                "location_address",
              ])
              .where("is_default", "=", true)
              .orderBy("display_order", "asc")
              .execute();

            if (defaultEvents.length > 0) {
              const eventsForIcs = defaultEvents.map((e) => ({
                ...e,
                event_date:
                  e.event_date instanceof Date
                    ? e.event_date
                    : e.event_date
                      ? new Date(`${e.event_date}T00:00:00`)
                      : null,
              }));

              const eventLines = defaultEvents
                .map((e) => {
                  const dateStr = e.event_date
                    ? new Date(`${e.event_date}T00:00:00`).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                    : "";
                  const timeStr = e.start_time
                    ? ` at ${e.start_time}${e.end_time ? ` – ${e.end_time}` : ""}`
                    : "";
                  const locationStr = e.location_name
                    ? `<br/><small>${e.location_name}${e.location_address ? `, ${e.location_address}` : ""}</small>`
                    : "";
                  return `<li><strong>${e.name}</strong> — ${dateStr}${timeStr}${locationStr}</li>`;
                })
                .join("");

              for (const guest of attendingWithEmailMulti) {
                try {
                  const guestName = `${guest.first_name}${guest.last_name ? ` ${guest.last_name}` : ""}`;
                  const icsContent = generateIcs(eventsForIcs, guestName);
                  const html = `
                    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2d2d2d;">
                      <h2 style="font-weight: normal; color: #7c6a5e;">Your Calendar Invite 💕</h2>
                      <p>Hi ${guest.first_name},</p>
                      <p>We're so excited to celebrate with you! Please find attached a calendar invite for our wedding events.</p>
                      <ul style="line-height: 2;">${eventLines}</ul>
                      <p>Open the attached <strong>.ics file</strong> to add these events to your calendar.</p>
                      <p>With love,<br/>Helen &amp; Enrique</p>
                    </div>
                  `.trim();

                  await sendEmail({
                    from: "Helen & Enrique <rsvp@helen-and-enrique.com>",
                    to: guest.email as string,
                    subject:
                      "Your Calendar Invite — Helen & Enrique's Wedding 💕",
                    html,
                    attachments: [
                      {
                        filename: "helen-and-enrique-wedding.ics",
                        content: Buffer.from(icsContent).toString("base64"),
                      },
                    ],
                  });

                  await db
                    .updateTable("guests")
                    .set({
                      calendar_invite_sent: true,
                      calendar_invite_sent_at: new Date().toISOString(),
                    })
                    .where("id", "=", guest.id)
                    .execute();
                } catch (calendarError) {
                  console.error(
                    `Error sending calendar invite to guest ${guest.id}:`,
                    calendarError,
                  );
                }
              }
            }
          }
        } catch (emailError) {
          console.error("Error sending RSVP notification email:", emailError);
        }
      });
    }

    revalidatePath("/rsvp");
    return { success: true };
  } catch (error) {
    console.error("Error submitting multi-guest RSVP:", error);
    return { success: false, error: "Failed to submit RSVP" };
  }
}
