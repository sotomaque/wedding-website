import { z } from "zod";

export const GuestResponse = z.object({
  id: z.string().uuid().describe("Guest UUID"),
  first_name: z.string().describe("First name"),
  last_name: z.string().nullable().describe("Last name"),
  email: z.string().email().nullable().describe("Email address"),
  invite_code: z.string().describe("Unique invite code"),
  rsvp_status: z.enum(["pending", "yes", "no"]).describe("RSVP status"),
  plus_one_allowed: z.boolean().describe("Whether a plus-one is allowed"),
  dietary_restrictions: z.string().nullable().describe("Dietary restrictions"),
  side: z
    .enum(["bride", "groom", "both"])
    .nullable()
    .describe("Bride or groom side"),
  list: z.enum(["a", "b", "c"]).describe("Guest list tier"),
  is_plus_one: z.boolean().describe("Whether this guest is a plus-one"),
  primary_guest_id: z
    .string()
    .uuid()
    .nullable()
    .describe("ID of the primary guest if this is a plus-one"),
  party_id: z.string().uuid().nullable().describe("Party group ID"),
  family: z.boolean().describe("Whether this is a family group"),
  under_21: z.boolean().describe("Whether this guest is under 21"),
  three_and_under: z.boolean().describe("Whether this guest is 3 or under"),
  notes: z.string().nullable().describe("Admin notes"),
  gender: z.enum(["male", "female"]).nullable().describe("Gender"),
  bridal_party_role: z
    .enum(["groomsman", "best_man", "bridesmaid", "maid_of_honor"])
    .nullable()
    .describe("Bridal party role"),
  created_at: z.string().describe("Creation timestamp"),
});

export const GuestListResponse = z.object({
  guests: z.array(GuestResponse).describe("List of guests"),
});

export const GuestDetailResponse = z.object({
  guest: GuestResponse.describe("Primary guest"),
  plusOne: GuestResponse.nullable().describe("Plus-one guest if exists"),
});

export const CreateGuestBody = z.object({
  firstName: z.string().describe("First name (required)"),
  lastName: z.string().optional().describe("Last name"),
  email: z.string().email().optional().describe("Email address"),
  side: z
    .enum(["bride", "groom", "both"])
    .optional()
    .describe("Bride or groom side"),
  list: z
    .enum(["a", "b", "c"])
    .optional()
    .describe("Guest list tier (defaults to 'a')"),
  plusOneAllowed: z
    .boolean()
    .optional()
    .describe("Whether a plus-one is allowed"),
  plusOneFirstName: z.string().optional().describe("Plus-one first name"),
  plusOneLastName: z.string().optional().describe("Plus-one last name"),
  sendEmail: z
    .boolean()
    .optional()
    .describe("Whether to send invitation email"),
  mailingAddress: z.string().optional().describe("Mailing address"),
  phoneNumber: z.string().optional().describe("Phone number"),
  whatsapp: z.string().optional().describe("WhatsApp number"),
  preferredContactMethod: z
    .enum(["email", "text", "whatsapp", "phone_call"])
    .optional()
    .describe("Preferred contact method"),
  family: z.boolean().optional().describe("Whether this is a family group"),
  under21: z.boolean().optional().describe("Whether the guest is under 21"),
  threeAndUnder: z
    .boolean()
    .optional()
    .describe("Whether the guest is 3 or under"),
  notes: z.string().optional().describe("Admin notes"),
  gender: z.enum(["male", "female"]).optional().describe("Gender"),
  bridalPartyRole: z
    .enum(["groomsman", "best_man", "bridesmaid", "maid_of_honor"])
    .optional()
    .describe("Bridal party role"),
  partyId: z
    .string()
    .uuid()
    .optional()
    .describe("Existing party ID to add guest to"),
});

export const CreateGuestResponse = z.object({
  guest: GuestResponse.describe("Created guest"),
  plusOneGuest: GuestResponse.nullable().describe("Created plus-one guest"),
});

export const UpdateGuestBody = z.object({
  firstName: z.string().optional().describe("First name"),
  lastName: z.string().optional().describe("Last name"),
  email: z.string().email().optional().describe("Email address"),
  side: z.enum(["bride", "groom", "both"]).optional().describe("Side"),
  list: z.enum(["a", "b", "c"]).optional().describe("Guest list tier"),
  plusOneAllowed: z
    .boolean()
    .optional()
    .describe("Whether a plus-one is allowed"),
  plusOneFirstName: z.string().optional().describe("Plus-one first name"),
  plusOneLastName: z.string().optional().describe("Plus-one last name"),
  mailingAddress: z.string().optional().describe("Mailing address"),
  physicalInviteSent: z
    .boolean()
    .optional()
    .describe("Whether physical invite was sent"),
  phoneNumber: z.string().optional().describe("Phone number"),
  whatsapp: z.string().optional().describe("WhatsApp number"),
  preferredContactMethod: z
    .enum(["email", "text", "whatsapp", "phone_call"])
    .optional()
    .describe("Preferred contact method"),
  family: z.boolean().optional().describe("Family group"),
  under21: z.boolean().optional().describe("Under 21"),
  threeAndUnder: z.boolean().optional().describe("3 and under"),
  notes: z.string().optional().describe("Admin notes"),
  gender: z.enum(["male", "female"]).optional().describe("Gender"),
  bridalPartyRole: z
    .enum(["groomsman", "best_man", "bridesmaid", "maid_of_honor"])
    .optional()
    .describe("Bridal party role"),
  partyId: z.string().uuid().optional().describe("Party ID to move guest to"),
});

export const UpdateGuestResponse = z.object({
  guest: GuestResponse.describe("Updated guest"),
});

export const DeleteGuestParams = z.object({
  id: z.string().uuid().describe("Guest ID to delete"),
});
