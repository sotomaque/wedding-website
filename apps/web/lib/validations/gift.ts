import { z } from "zod";

export const editGiftSchema = z.object({
  guestId: z.string().nullable(),
  thankYouEmailSent: z.boolean(),
  notes: z.string().optional(),
});

export type EditGiftFormData = z.infer<typeof editGiftSchema>;
