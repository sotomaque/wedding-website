/**
 * Zod schema for the guest-export request body. Shared shape between the wizard
 * client and the `/api/admin/guests/export` route. No server-only imports here
 * so the client can import the inferred type safely.
 */

import { z } from "zod";

export const exportFiltersSchema = z.object({
  rsvpStatus: z.enum(["all", "yes", "no", "pending", "responded"]).optional(),
  side: z.enum(["bride", "groom", "both"]).optional(),
  list: z.enum(["a", "b", "c"]).optional(),
  family: z.boolean().optional(),
  isPlusOne: z.boolean().optional(),
  under21: z.boolean().optional(),
  threeAndUnder: z.boolean().optional(),
});

export const exportRequestSchema = z
  .object({
    format: z.enum(["csv", "xlsx"]),
    delivery: z.enum(["download", "email"]),
    columns: z.array(z.string()).optional(),
    filters: exportFiltersSchema.optional(),
    // Comma-separated recipient list; required when delivery === "email".
    recipients: z.string().optional(),
  })
  .refine((data) => data.delivery !== "email" || !!data.recipients?.trim(), {
    message: "At least one recipient email is required",
    path: ["recipients"],
  });

export type ExportRequest = z.infer<typeof exportRequestSchema>;

/** Split + validate a comma-separated recipient string into clean emails. */
export function parseRecipients(raw: string): {
  emails: string[];
  invalid: string[];
} {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (emailRe.test(trimmed)) emails.push(trimmed);
    else invalid.push(trimmed);
  }
  return { emails, invalid };
}
