import { z } from "zod";

export const GiftResponse = z.object({
  id: z.string().uuid().describe("Gift UUID"),
  stripe_checkout_session_id: z
    .string()
    .nullable()
    .describe("Stripe checkout session ID"),
  stripe_payment_intent_id: z
    .string()
    .nullable()
    .describe("Stripe payment intent ID"),
  stripe_payment_link_id: z
    .string()
    .nullable()
    .describe("Stripe payment link ID"),
  donor_email: z.string().nullable().describe("Donor email"),
  donor_name: z.string().nullable().describe("Donor name"),
  amount_cents: z.number().describe("Amount in cents"),
  currency: z.string().describe("Currency code"),
  gift_type: z
    .string()
    .nullable()
    .describe("Gift type (baby_fund, honeymoon, student_loans)"),
  guest_id: z.string().uuid().nullable().describe("Matched guest ID"),
  status: z.string().describe("Payment status"),
  thank_you_email_sent: z
    .boolean()
    .describe("Whether thank-you email was sent"),
  thank_you_email_sent_at: z
    .string()
    .nullable()
    .describe("When thank-you email was sent"),
  created_at: z.string().describe("Creation timestamp"),
  updated_at: z.string().nullable().describe("Last update timestamp"),
  guest_first_name: z.string().nullable().describe("Matched guest first name"),
  guest_last_name: z.string().nullable().describe("Matched guest last name"),
  guest_invite_code: z
    .string()
    .nullable()
    .describe("Matched guest invite code"),
});

export const GiftTotals = z.object({
  total_amount_cents: z.number().describe("Total amount in cents"),
  by_type: z.object({
    baby_fund: z.number().describe("Baby fund total in cents"),
    honeymoon: z.number().describe("Honeymoon total in cents"),
    student_loans: z.number().describe("Student loans total in cents"),
    unknown: z.number().describe("Unknown type total in cents"),
  }),
  count: z.number().describe("Total gift count"),
  matched_to_guests: z.number().describe("Gifts matched to guests"),
});

export const GiftListResponse = z.object({
  gifts: z.array(GiftResponse).describe("List of gifts"),
  totals: GiftTotals.describe("Gift totals"),
});

export const UpdateGiftBody = z.object({
  id: z.string().uuid().describe("Gift ID (required)"),
  thank_you_email_sent: z
    .boolean()
    .optional()
    .describe("Mark thank-you as sent"),
  guest_id: z.string().uuid().optional().describe("Link gift to guest"),
  notes: z.string().optional().describe("Admin notes"),
});

export const UpdateGiftResponse = z.object({
  gift: GiftResponse.describe("Updated gift"),
});
