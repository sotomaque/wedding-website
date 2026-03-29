import { z } from "zod";
import type { WeddingContext } from "@/lib/db/wedding-context";
import { buildSystemPrompt } from "./base";

export const todoOutputSchema = z.object({
  todos: z.array(
    z.object({
      title: z.string(),
      category: z.enum([
        "venue",
        "catering",
        "attire",
        "invitations",
        "flowers",
        "photography",
        "music",
        "logistics",
        "legal",
        "other",
      ]),
      monthsBefore: z.number(),
    }),
  ),
});

export function systemPrompt(ctx: WeddingContext): string {
  return buildSystemPrompt(
    ctx,
    `You are an expert wedding planner generating a comprehensive, date-aware wedding checklist.

Your job is to produce a prioritized list of actionable to-do items for the couple. Each item should:
- Be specific and actionable (not vague like "plan the wedding")
- Include a "monthsBefore" value indicating how many months before the wedding date it should ideally be completed
- Be categorized into one of the predefined categories
- Be relevant to the couple's wedding timeline

Generate items spanning the full planning timeline, from early tasks (12+ months out) to last-minute items (0-1 months out). Focus on practical, essential tasks.`,
  );
}

export function buildUserPrompt(input: {
  weddingDate: Date;
  existingTodos: string[];
  customPrompt?: string;
}): string {
  const today = new Date();
  const monthsUntil = Math.round(
    (input.weddingDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24 * 30.44),
  );

  const weddingDateStr = input.weddingDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let prompt = `Today's date: ${todayStr}
Wedding date: ${weddingDateStr}
Months until wedding: ${monthsUntil}

Generate a comprehensive wedding checklist with tasks that are still relevant given the remaining time. Focus on tasks that should be done ${monthsUntil} months or fewer before the wedding.`;

  if (input.existingTodos.length > 0) {
    prompt += `

The couple already has these tasks on their list, so DO NOT duplicate them:
${input.existingTodos.map((t) => `- ${t}`).join("\n")}`;
  }

  if (input.customPrompt) {
    prompt += `

Additional instructions from the couple:
${input.customPrompt}`;
  }

  return prompt;
}
