import { z } from "zod";

/** POST /api/registry/claim — a guest claims a product item. */
export const registryClaimSchema = z.object({
  itemId: z.string().min(1, { error: "Item is required" }),
  name: z.string().trim().min(1, { error: "Your name is required" }).max(200),
  email: z
    .string()
    .trim()
    .email({ error: "A valid email is required" })
    .max(320),
});
export type RegistryClaimInput = z.infer<typeof registryClaimSchema>;

/** DELETE /api/registry/claim — release a claim using the claimant's email. */
export const registryUnclaimSchema = z.object({
  itemId: z.string().min(1, { error: "Item is required" }),
  email: z
    .string()
    .trim()
    .email({ error: "A valid email is required" })
    .max(320),
});
export type RegistryUnclaimInput = z.infer<typeof registryUnclaimSchema>;
