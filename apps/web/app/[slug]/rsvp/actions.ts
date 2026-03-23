"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import {
  buildCalendarEmailHtml,
  generateIcs,
} from "@/lib/calendar/generate-ics";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { RSVP_NOTIFICATION_TEMPLATE_ALIAS } from "@/lib/email/constants";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { multiGuestRsvpSchema } from "@/lib/validations/rsvp";

// ---------------------------------------------------------------------------
// Narrowed guest type — only the columns the RSVP client needs.
// Exported so RSVPFormView / RSVPForm / GuestRsvpCard can import it as a type.
// ---------------------------------------------------------------------------
export interface RsvpGuest {
  id: string;
  firstName: string;
  lastName: string | null;
  rsvpStatus: string | null;
  isPlusOne: boolean | null;
  plusOneAllowed: boolean | null;
  primaryGuestId: string | null;
  dietaryRestrictions: string | null;
  under21: boolean | null;
  threeAndUnder: boolean | null;
  mailingAddress: string | null;
  phoneNumber: string | null;
  whatsapp: string | null;
  preferredContactMethod: string | null;
  arrivalDate: string | null;
  arrivalTransport: string | null;
  departureDate: string | null;
  departureTransport: string | null;
  accommodationNotes: string | null;
}

// Columns sent to the client (Prisma select object)
const RSVP_GUEST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  rsvpStatus: true,
  isPlusOne: true,
  plusOneAllowed: true,
  primaryGuestId: true,
  dietaryRestrictions: true,
  under21: true,
  threeAndUnder: true,
  mailingAddress: true,
  phoneNumber: true,
  whatsapp: true,
  preferredContactMethod: true,
  arrivalDate: true,
  arrivalTransport: true,
  departureDate: true,
  departureTransport: true,
  accommodationNotes: true,
} as const;

// Superset needed internally for insert/update logic (not sent to client)
const PARTY_GUEST_SELECT = {
  ...RSVP_GUEST_SELECT,
  email: true,
  inviteCode: true,
  partyId: true,
  side: true,
  list: true,
  family: true,
} as const;

// ---------------------------------------------------------------------------
// verifyInviteCode
// ---------------------------------------------------------------------------
export async function verifyInviteCode(code: string): Promise<{
  success: boolean;
  guests?: RsvpGuest[];
  error?: string;
}> {
  try {
    const weddingId = await getWeddingId();
    if (!code) {
      return { success: false, error: "Invite code is required" };
    }

    const party = await db.party.findFirst({
      where: { inviteCode: code.toUpperCase(), weddingId },
      select: { id: true, inviteCode: true },
    });

    if (!party) {
      // Fallback: check guests table directly for backwards compatibility
      const guestsByCode = await db.guest.findMany({
        where: { inviteCode: code.toUpperCase(), weddingId },
        select: RSVP_GUEST_SELECT,
      });

      if (!guestsByCode || guestsByCode.length === 0) {
        return { success: false, error: "Invalid invite code" };
      }

      return { success: true, guests: guestsByCode as RsvpGuest[] };
    }

    const guests = await db.guest.findMany({
      where: { partyId: party.id, weddingId },
      select: RSVP_GUEST_SELECT,
    });

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

    const weddingId = await getWeddingId();

    const party = await db.party.findFirst({
      where: { inviteCode: inviteCode.toUpperCase(), weddingId },
      select: { id: true, inviteCode: true },
    });

    const guests = party
      ? await db.guest.findMany({
          where: { partyId: party.id, weddingId },
          select: PARTY_GUEST_SELECT,
        })
      : await db.guest.findMany({
          where: { inviteCode: inviteCode.toUpperCase(), weddingId },
          select: PARTY_GUEST_SELECT,
        });

    if (!guests || guests.length === 0) {
      return { success: false, error: "Invalid invite code" };
    }

    const primaryGuest = guests.find((g) => !g.isPlusOne);
    const existingPlusOne = guests.find((g) => g.isPlusOne);

    if (!primaryGuest) {
      return { success: false, error: "Primary guest not found" };
    }

    await db.guest.update({
      where: { id: primaryGuest.id },
      data: {
        firstName: firstName,
        lastName: lastName || null,
        rsvpStatus: attending ? "yes" : "no",
        dietaryRestrictions: attending ? dietaryRestrictions || null : null,
        under21: under21 ?? primaryGuest.under21,
        threeAndUnder: threeAndUnder ?? primaryGuest.threeAndUnder,
        mailingAddress: mailingAddress || null,
        phoneNumber: phoneNumber || null,
        whatsapp: whatsapp || null,
        preferredContactMethod: preferredContactMethod || null,
      },
    });

    if (primaryGuest.plusOneAllowed) {
      if (!attending) {
        if (existingPlusOne) {
          await db.guest.update({
            where: { id: existingPlusOne.id },
            data: { rsvpStatus: "no", dietaryRestrictions: null },
          });
        }
      } else if (plusOneAttending && plusOneFirstName?.trim()) {
        if (existingPlusOne) {
          await db.guest.update({
            where: { id: existingPlusOne.id },
            data: {
              firstName: plusOneFirstName,
              lastName: plusOneLastName || null,
              email: plusOneEmail || existingPlusOne.email,
              rsvpStatus: "yes",
              dietaryRestrictions: plusOneDietaryRestrictions || null,
              under21: plusOneUnder21 ?? existingPlusOne.under21,
              threeAndUnder:
                plusOneThreeAndUnder ?? existingPlusOne.threeAndUnder,
              phoneNumber: plusOnePhoneNumber || null,
              whatsapp: plusOneWhatsapp || null,
              preferredContactMethod: plusOnePreferredContactMethod || null,
            },
          });
        } else {
          await db.guest.create({
            data: {
              firstName: plusOneFirstName,
              lastName: plusOneLastName || null,
              email: plusOneEmail || primaryGuest.email,
              inviteCode: primaryGuest.inviteCode,
              partyId: primaryGuest.partyId,
              side: primaryGuest.side,
              list: primaryGuest.list,
              isPlusOne: true,
              plusOneAllowed: false,
              primaryGuestId: primaryGuest.id,
              rsvpStatus: "yes",
              dietaryRestrictions: plusOneDietaryRestrictions || null,
              under21: plusOneUnder21 ?? false,
              threeAndUnder: plusOneThreeAndUnder ?? false,
              mailingAddress: mailingAddress || null,
              phoneNumber: plusOnePhoneNumber || null,
              whatsapp: plusOneWhatsapp || null,
              preferredContactMethod: plusOnePreferredContactMethod || null,
              numberOfResends: 0,
              physicalInviteSent: false,
              family: primaryGuest.family,
              weddingId,
            },
          });
        }
      } else if (existingPlusOne && plusOneAttending === false) {
        await db.guest.update({
          where: { id: existingPlusOne.id },
          data: { rsvpStatus: "no", dietaryRestrictions: null },
        });
      }
    }

    // Fire-and-forget: send notification email after response
    // Capture settings before after() since headers aren't available inside after()
    const settings = await getWeddingSettings();
    const recipients = getNotificationRecipients(settings);
    if (getResendClient() && recipients.length > 0) {
      const capturedParty = party;
      const capturedInviteCode = inviteCode;
      const capturedAttending = attending;
      const capturedDietary = dietaryRestrictions;
      const capturedFromAddress = getEmailFromAddress(settings, "Wedding RSVP");
      const capturedCalendarFromAddress = getEmailFromAddress(settings);
      const capturedCoupleName = settings.coupleName;
      const capturedSlug = settings.slug;
      after(async () => {
        try {
          const updatedGuests = await db.guest.findMany({
            where: capturedParty
              ? { partyId: capturedParty.id, weddingId }
              : { inviteCode: capturedInviteCode.toUpperCase(), weddingId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              rsvpStatus: true,
            },
          });

          const guestNames = updatedGuests
            .map((g) => `${g.firstName}${g.lastName ? ` ${g.lastName}` : ""}`)
            .join(", ");
          const guestEmails = updatedGuests
            .filter((g) => g.email)
            .map((g) => g.email)
            .join(", ");

          await sendEmail({
            from: capturedFromAddress,
            to: recipients,
            template: {
              id: RSVP_NOTIFICATION_TEMPLATE_ALIAS,
              variables: {
                GUEST_NAMES: guestNames,
                GUEST_EMAILS: guestEmails || "No email provided",
                INVITE_CODE: capturedInviteCode.toUpperCase(),
                STATUS_TEXT: capturedAttending ? "Attending" : "Not Attending",
                STATUS_EMOJI: capturedAttending ? "\u2705" : "\u274C",
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
            (g) => g.rsvpStatus === "yes" && g.email?.includes("@"),
          );
          if (attendingWithEmail.length > 0) {
            const defaultEvents = await db.event.findMany({
              where: { isDefault: true, weddingId },
              select: {
                id: true,
                name: true,
                eventDate: true,
                startTime: true,
                endTime: true,
                locationName: true,
                locationAddress: true,
              },
              orderBy: { displayOrder: "asc" },
            });

            if (defaultEvents.length > 0) {
              const eventsForIcs = defaultEvents.map((e) => ({
                id: e.id,
                name: e.name,
                event_date:
                  e.eventDate instanceof Date
                    ? e.eventDate
                    : e.eventDate
                      ? new Date(`${e.eventDate}T00:00:00`)
                      : null,
                start_time: e.startTime
                  ? e.startTime instanceof Date
                    ? e.startTime.toISOString()
                    : String(e.startTime)
                  : null,
                end_time: e.endTime
                  ? e.endTime instanceof Date
                    ? e.endTime.toISOString()
                    : String(e.endTime)
                  : null,
                location_name: e.locationName,
                location_address: e.locationAddress,
              }));

              for (const guest of attendingWithEmail) {
                try {
                  const guestName = `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`;
                  const icsContent = generateIcs(
                    eventsForIcs,
                    guestName,
                    settings.coupleName,
                  );
                  const html = buildCalendarEmailHtml(
                    eventsForIcs,
                    guest.firstName,
                  );

                  await sendEmail({
                    from: capturedCalendarFromAddress,
                    to: guest.email as string,
                    subject: `Your Calendar Invite \u2014 ${capturedCoupleName}'s Wedding \uD83D\uDC95`,
                    html,
                    attachments: [
                      {
                        filename: `${capturedSlug}-wedding.ics`,
                        content: Buffer.from(icsContent).toString("base64"),
                      },
                    ],
                  });

                  await db.guest.update({
                    where: { id: guest.id },
                    data: {
                      calendarInviteSent: true,
                      calendarInviteSentAt: new Date().toISOString(),
                    },
                  });
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

    const weddingId = await getWeddingId();

    const party = await db.party.findFirst({
      where: { inviteCode: inviteCode.toUpperCase(), weddingId },
      select: { id: true, inviteCode: true },
    });

    const partyGuests = party
      ? await db.guest.findMany({
          where: { partyId: party.id, weddingId },
          select: PARTY_GUEST_SELECT,
        })
      : await db.guest.findMany({
          where: { inviteCode: inviteCode.toUpperCase(), weddingId },
          select: PARTY_GUEST_SELECT,
        });

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

        await db.guest.update({
          where: { id: guestRsvp.guestId },
          data: {
            firstName: guestRsvp.firstName,
            lastName: guestRsvp.lastName || null,
            rsvpStatus: guestRsvp.attending ? "yes" : "no",
            dietaryRestrictions: guestRsvp.attending
              ? guestRsvp.dietaryRestrictions || null
              : null,
            under21: guestRsvp.under21 ?? existingGuest.under21,
            threeAndUnder:
              guestRsvp.threeAndUnder ?? existingGuest.threeAndUnder,
            mailingAddress: mailingAddress || existingGuest.mailingAddress,
            phoneNumber: phoneNumber || existingGuest.phoneNumber,
            whatsapp: whatsapp || existingGuest.whatsapp,
            preferredContactMethod:
              preferredContactMethod || existingGuest.preferredContactMethod,
            arrivalDate: arrivalDate || existingGuest.arrivalDate,
            arrivalTransport:
              arrivalTransport || existingGuest.arrivalTransport,
            departureDate: departureDate || existingGuest.departureDate,
            departureTransport:
              departureTransport || existingGuest.departureTransport,
            accommodationNotes:
              accommodationNotes || existingGuest.accommodationNotes,
          },
        });

        if (guestRsvp.plusOneAllowed) {
          const existingPlusOne = guestRsvp.existingPlusOneId
            ? partyGuests.find((g) => g.id === guestRsvp.existingPlusOneId)
            : partyGuests.find(
                (g) => g.isPlusOne && g.primaryGuestId === guestRsvp.guestId,
              );

          if (!guestRsvp.attending) {
            if (existingPlusOne) {
              await db.guest.update({
                where: { id: existingPlusOne.id },
                data: { rsvpStatus: "no", dietaryRestrictions: null },
              });
            }
          } else if (
            guestRsvp.plusOneAttending &&
            guestRsvp.plusOneFirstName?.trim()
          ) {
            if (existingPlusOne) {
              await db.guest.update({
                where: { id: existingPlusOne.id },
                data: {
                  firstName: guestRsvp.plusOneFirstName,
                  lastName: guestRsvp.plusOneLastName || null,
                  rsvpStatus: "yes",
                  dietaryRestrictions:
                    guestRsvp.plusOneDietaryRestrictions || null,
                  under21: guestRsvp.plusOneUnder21 ?? existingPlusOne.under21,
                  threeAndUnder:
                    guestRsvp.plusOneThreeAndUnder ??
                    existingPlusOne.threeAndUnder,
                },
              });
            } else {
              await db.guest.create({
                data: {
                  firstName: guestRsvp.plusOneFirstName,
                  lastName: guestRsvp.plusOneLastName || null,
                  email: existingGuest.email,
                  inviteCode: existingGuest.inviteCode,
                  partyId: existingGuest.partyId,
                  side: existingGuest.side,
                  list: existingGuest.list,
                  isPlusOne: true,
                  plusOneAllowed: false,
                  primaryGuestId: existingGuest.id,
                  rsvpStatus: "yes",
                  dietaryRestrictions:
                    guestRsvp.plusOneDietaryRestrictions || null,
                  under21: guestRsvp.plusOneUnder21 ?? false,
                  threeAndUnder: guestRsvp.plusOneThreeAndUnder ?? false,
                  mailingAddress: mailingAddress || null,
                  phoneNumber: phoneNumber || null,
                  whatsapp: whatsapp || null,
                  preferredContactMethod: preferredContactMethod || null,
                  numberOfResends: 0,
                  physicalInviteSent: false,
                  family: existingGuest.family,
                  weddingId,
                },
              });
            }
          } else if (existingPlusOne && guestRsvp.plusOneAttending === false) {
            await db.guest.update({
              where: { id: existingPlusOne.id },
              data: { rsvpStatus: "no", dietaryRestrictions: null },
            });
          }
        }
      }),
    );

    // Fire-and-forget: send notification email after response
    // Capture settings before after() since headers aren't available inside after()
    const settingsMulti = await getWeddingSettings();
    const recipientsMulti = getNotificationRecipients(settingsMulti);
    if (getResendClient() && recipientsMulti.length > 0) {
      const capturedParty = party;
      const capturedInviteCode = inviteCode;
      const capturedGuestRsvps = guestRsvps;
      const capturedFromAddress = getEmailFromAddress(
        settingsMulti,
        "Wedding RSVP",
      );
      const capturedCalendarFromAddress = getEmailFromAddress(settingsMulti);
      const capturedCoupleName = settingsMulti.coupleName;
      const capturedSlug = settingsMulti.slug;
      after(async () => {
        try {
          const updatedGuests = await db.guest.findMany({
            where: capturedParty
              ? { partyId: capturedParty.id, weddingId }
              : { inviteCode: capturedInviteCode.toUpperCase(), weddingId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              rsvpStatus: true,
            },
          });

          const attendingGuests = updatedGuests.filter(
            (g) => g.rsvpStatus === "yes",
          );
          const decliningGuests = updatedGuests.filter(
            (g) => g.rsvpStatus === "no",
          );
          const guestNames = updatedGuests
            .map((g) => `${g.firstName}${g.lastName ? ` ${g.lastName}` : ""}`)
            .join(", ");
          const guestEmails = updatedGuests
            .filter((g) => g.email)
            .map((g) => g.email)
            .join(", ");
          const attendingNames = attendingGuests
            .map((g) => g.firstName)
            .join(", ");
          const decliningNames = decliningGuests
            .map((g) => g.firstName)
            .join(", ");
          const anyAttending = attendingGuests.length > 0;

          await sendEmail({
            from: capturedFromAddress,
            to: recipientsMulti,
            template: {
              id: RSVP_NOTIFICATION_TEMPLATE_ALIAS,
              variables: {
                GUEST_NAMES: guestNames,
                GUEST_EMAILS: guestEmails || "No email provided",
                INVITE_CODE: capturedInviteCode.toUpperCase(),
                STATUS_TEXT: `${attendingNames || "None"} attending${decliningNames ? `, ${decliningNames} declined` : ""}`,
                STATUS_EMOJI: anyAttending ? "\u2705" : "\u274C",
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
            (g) => g.rsvpStatus === "yes" && g.email?.includes("@"),
          );
          if (attendingWithEmailMulti.length > 0) {
            const defaultEvents = await db.event.findMany({
              where: { isDefault: true, weddingId },
              select: {
                id: true,
                name: true,
                eventDate: true,
                startTime: true,
                endTime: true,
                locationName: true,
                locationAddress: true,
              },
              orderBy: { displayOrder: "asc" },
            });

            if (defaultEvents.length > 0) {
              const eventsForIcs = defaultEvents.map((e) => ({
                id: e.id,
                name: e.name,
                event_date:
                  e.eventDate instanceof Date
                    ? e.eventDate
                    : e.eventDate
                      ? new Date(`${e.eventDate}T00:00:00`)
                      : null,
                start_time: e.startTime
                  ? e.startTime instanceof Date
                    ? e.startTime.toISOString()
                    : String(e.startTime)
                  : null,
                end_time: e.endTime
                  ? e.endTime instanceof Date
                    ? e.endTime.toISOString()
                    : String(e.endTime)
                  : null,
                location_name: e.locationName,
                location_address: e.locationAddress,
              }));

              for (const guest of attendingWithEmailMulti) {
                try {
                  const guestName = `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`;
                  const icsContent = generateIcs(
                    eventsForIcs,
                    guestName,
                    settingsMulti.coupleName,
                  );
                  const html = buildCalendarEmailHtml(
                    eventsForIcs,
                    guest.firstName,
                  );

                  await sendEmail({
                    from: capturedCalendarFromAddress,
                    to: guest.email as string,
                    subject: `Your Calendar Invite \u2014 ${capturedCoupleName}'s Wedding \uD83D\uDC95`,
                    html,
                    attachments: [
                      {
                        filename: `${capturedSlug}-wedding.ics`,
                        content: Buffer.from(icsContent).toString("base64"),
                      },
                    ],
                  });

                  await db.guest.update({
                    where: { id: guest.id },
                    data: {
                      calendarInviteSent: true,
                      calendarInviteSentAt: new Date().toISOString(),
                    },
                  });
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
