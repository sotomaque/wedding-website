import { z } from "zod";

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
  plusOneUnder21: z.boolean().optional(),
  mailingAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  whatsapp: z.string().optional(),
  preferredContactMethod: z
    .enum(["email", "text", "whatsapp", "phone_call"])
    .optional()
    .or(z.literal("")),
});

export type RSVPFormData = z.infer<typeof rsvpFormSchema>;
