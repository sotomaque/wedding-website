import { z } from "zod";

export const RsvpVerifyParams = z.object({
  code: z.string().describe("Invite code (e.g. ABCD-1234)"),
});

export const RsvpVerifyResponse = z.object({
  guests: z
    .array(
      z.object({
        id: z.string().uuid(),
        first_name: z.string(),
        last_name: z.string().nullable(),
        email: z.string().nullable(),
        invite_code: z.string(),
        rsvp_status: z.enum(["pending", "yes", "no"]),
        plus_one_allowed: z.boolean(),
        dietary_restrictions: z.string().nullable(),
        is_plus_one: z.boolean(),
      }),
    )
    .describe("Guests associated with the invite code"),
});

export const RsvpSubmitBody = z.object({
  inviteCode: z.string().describe("Invite code (required)"),
  attending: z.boolean().describe("Whether the guest is attending"),
  dietaryRestrictions: z.string().optional().describe("Dietary restrictions"),
});

export const RsvpSubmitResponse = z.object({
  success: z.boolean().describe("Whether the RSVP was submitted"),
});

export const RsvpUpdateInfoBody = z.object({
  inviteCode: z.string().describe("Invite code"),
  email: z.string().email().optional().describe("Updated email"),
  phoneNumber: z.string().optional().describe("Updated phone number"),
  whatsapp: z.string().optional().describe("Updated WhatsApp number"),
  preferredContactMethod: z
    .enum(["email", "text", "whatsapp", "phone_call"])
    .optional()
    .describe("Preferred contact method"),
});
