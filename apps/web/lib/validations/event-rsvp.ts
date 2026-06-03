import { z } from "zod";

/** One additional household member (plus-one / child) added on a public RSVP. */
const additionalGuestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().max(100).optional(),
});

/** Up to a sane number of extra heads per submission. */
const additionalGuests = z.array(additionalGuestSchema).max(20).optional();

/**
 * Public per-event RSVP submitted via a shareable link. The invitee either has
 * an invite code (existing guest) or types their name (self-registers). The two
 * modes are a discriminated union so each carries exactly the fields it needs.
 * Either mode may bring additional household members, who RSVP with the same
 * attending status and each count toward the event's capacity.
 */
export const publicEventRsvpSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("code"),
    token: z.string().trim().min(1).max(64),
    code: z.string().trim().min(1).max(100),
    attending: z.boolean(),
    additionalGuests,
  }),
  z.object({
    mode: z.literal("name"),
    token: z.string().trim().min(1).max(64),
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().max(100).optional(),
    email: z.string().trim().email().max(200).optional().or(z.literal("")),
    attending: z.boolean(),
    additionalGuests,
  }),
]);

export type PublicEventRsvpInput = z.infer<typeof publicEventRsvpSchema>;
export type AdditionalGuestInput = z.infer<typeof additionalGuestSchema>;
