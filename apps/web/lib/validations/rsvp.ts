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
  guests: z.array(guestRsvpSchema).min(1),
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
