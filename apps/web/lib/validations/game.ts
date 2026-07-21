import { z } from "zod";

/** A guest's game submission: their name + one option pick per question. */
export const gameSubmitSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        optionId: z.string().min(1),
      }),
    )
    .max(200),
});

export type GameSubmitInput = z.infer<typeof gameSubmitSchema>;
