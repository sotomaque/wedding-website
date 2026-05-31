import { z } from "zod";

// Legacy schema for backwards compatibility (single guest + plus-one)
export const rsvpFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  attending: z.boolean(),
  plusOneAttending: z.boolean().optional(),
  plusOneFirstName: z.string().optional(),
  plusOneLastName: z.string().optional(),
  plusOneEmail: z.string().optional(),
  plusOnePhoneNumber: z.string().optional(),
  plusOneWhatsapp: z.string().optional(),
  plusOnePreferredContactMethod: z
    .enum(["email", "text", "whatsapp", "phone_call"])
    .optional()
    .or(z.literal("")),
  plusOneDietaryRestrictions: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  under21: z.boolean().optional(),
  threeAndUnder: z.boolean().optional(),
  plusOneUnder21: z.boolean().optional(),
  plusOneThreeAndUnder: z.boolean().optional(),
  mailingAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  whatsapp: z.string().optional(),
  preferredContactMethod: z
    .enum(["email", "text", "whatsapp", "phone_call"])
    .optional()
    .or(z.literal("")),
});

export type RSVPFormData = z.infer<typeof rsvpFormSchema>;

// Per-guest RSVP data for multi-guest form
export const guestRsvpSchema = z.object({
  guestId: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  attending: z.boolean(),
  dietaryRestrictions: z.string().optional(),
  under21: z.boolean().optional(),
  threeAndUnder: z.boolean().optional(),
  // Plus-one fields (only if guest has plus_one_allowed)
  plusOneAllowed: z.boolean(),
  existingPlusOneId: z.string().optional(),
  plusOneAttending: z.boolean().optional(),
  plusOneFirstName: z.string().optional(),
  plusOneLastName: z.string().optional(),
  plusOneDietaryRestrictions: z.string().optional(),
  plusOneUnder21: z.boolean().optional(),
  plusOneThreeAndUnder: z.boolean().optional(),
});

export type GuestRsvpData = z.infer<typeof guestRsvpSchema>;

// Multi-guest RSVP form schema
export const multiGuestRsvpSchema = z.object({
  guests: z.array(guestRsvpSchema).min(1, "At least one guest is required"),
  // Shared contact info (party-level)
  mailingAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  whatsapp: z.string().optional(),
  preferredContactMethod: z
    .enum(["email", "text", "whatsapp", "phone_call"])
    .optional()
    .or(z.literal("")),
  // Shared travel info (party-level)
  arrivalDate: z.string().optional(),
  arrivalTransport: z.string().optional(),
  departureDate: z.string().optional(),
  departureTransport: z.string().optional(),
  accommodationNotes: z.string().optional(),
});

export type MultiGuestRsvpFormData = z.infer<typeof multiGuestRsvpSchema>;

// --- Public REST API request schemas ---
// These guard the public /api/rsvp/* endpoints (the documented REST surface),
// where the request body comes from untrusted external callers rather than the
// in-app form. Invite codes are length-bounded; free-text fields are capped to
// keep a malformed/abusive payload from reaching the database.

const inviteCode = z.string().trim().min(1).max(100);
const contactMethod = z
  .enum(["email", "text", "whatsapp", "phone_call"])
  .or(z.literal(""))
  .nullish();

/** GET /api/rsvp/verify — `code` query parameter. */
export const rsvpVerifyQuerySchema = z.object({
  code: inviteCode,
});

/** POST /api/rsvp/submit — single party-level accept/decline. */
export const rsvpSubmitSchema = z.object({
  inviteCode,
  attending: z.boolean(),
  dietaryRestrictions: z.string().max(2000).nullish(),
});
export type RsvpSubmitData = z.infer<typeof rsvpSubmitSchema>;

/** PATCH /api/rsvp/update-info — party-level contact details. */
export const rsvpUpdateInfoSchema = z.object({
  inviteCode,
  mailingAddress: z.string().max(500).nullish(),
  phoneNumber: z.string().max(50).nullish(),
  whatsapp: z.string().max(50).nullish(),
  preferredContactMethod: contactMethod,
});
export type RsvpUpdateInfoData = z.infer<typeof rsvpUpdateInfoSchema>;
