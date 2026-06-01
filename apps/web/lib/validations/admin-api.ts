/**
 * Request schemas for the admin mutation API routes. These routes previously
 * validated with ad-hoc `if (!field)` checks; centralizing the shape in zod
 * gives consistent rejection of malformed bodies and unknown keys (zod's
 * default object behavior strips them).
 *
 * Custom error messages preserve the exact strings the routes returned before,
 * so existing API consumers and tests see no change.
 */

import { z } from "zod";

// --- POST /api/admin/events ---
export const createEventSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" }),
  description: z.string().nullish(),
  // Date / time fields arrive as strings and are parsed in the route.
  eventDate: z.string().nullish(),
  // Optional end date for multi-day events (YYYY-MM-DD). When set and after
  // eventDate, the event spans the range; otherwise it's single-day.
  endDate: z.string().nullish(),
  startTime: z.string().nullish(),
  endTime: z.string().nullish(),
  locationName: z.string().nullish(),
  locationAddress: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  isDefault: z.boolean().optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

// --- POST /api/admin/templates ---
export const createTemplateSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  isActive: z.boolean().optional(),
  variables: z.unknown().optional(),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// --- PATCH /api/admin/gifts ---
export const updateGiftSchema = z.object({
  id: z
    .string({ error: "Gift ID is required" })
    .min(1, { error: "Gift ID is required" }),
  thankYouEmailSent: z.boolean().optional(),
  guestId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type UpdateGiftInput = z.infer<typeof updateGiftSchema>;
