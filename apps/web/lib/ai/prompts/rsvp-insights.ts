import { z } from "zod";
import type { WeddingContext } from "@/lib/db/wedding-context";
import { buildSystemPrompt } from "./base";

const FEATURE_INSTRUCTIONS = `You are analyzing RSVP data for a wedding. Generate 3-5 concise, actionable insights based on the data provided.

Guidelines:
- Each insight should be exactly one sentence
- Be specific with numbers and percentages
- Focus on what's actionable or noteworthy
- Categorize each insight:
  - urgency: time-sensitive items (deadlines approaching, low response rates)
  - trend: patterns in the data (acceptance rates, dietary trends)
  - action: recommended next steps (send reminders, follow up with specific groups)
  - summary: key statistics worth highlighting`;

export const insightsOutputSchema = z.object({
  insights: z.array(
    z.object({
      text: z.string().describe("One-sentence insight"),
      category: z
        .enum(["urgency", "trend", "action", "summary"])
        .describe("Insight category"),
    }),
  ),
});

export function systemPrompt(ctx: WeddingContext): string {
  return buildSystemPrompt(ctx, FEATURE_INSTRUCTIONS);
}

export interface RsvpStats {
  totalGuests: number;
  attending: number;
  declined: number;
  pending: number;
  invited: number;
  uninvited: number;
  byList: Record<string, { total: number; attending: number; pending: number }>;
  bySide: Record<string, { total: number; attending: number }>;
  dietaryRestrictions: string[];
  daysUntilWedding: number;
  daysUntilDeadline: number | null;
}

export function buildUserPrompt(stats: RsvpStats): string {
  const lines = [
    `RSVP Data Summary:`,
    `- Total guests: ${stats.totalGuests}`,
    `- Invited (email sent): ${stats.invited}`,
    `- Not yet invited: ${stats.uninvited}`,
    `- Attending: ${stats.attending}`,
    `- Declined: ${stats.declined}`,
    `- Pending: ${stats.pending}`,
    `- Days until wedding: ${stats.daysUntilWedding}`,
  ];

  if (stats.daysUntilDeadline !== null) {
    lines.push(`- Days until RSVP deadline: ${stats.daysUntilDeadline}`);
  }

  lines.push("", "By list tier:");
  for (const [list, data] of Object.entries(stats.byList)) {
    lines.push(
      `- ${list.toUpperCase()}-list: ${data.total} total, ${data.attending} attending, ${data.pending} pending`,
    );
  }

  lines.push("", "By side:");
  for (const [side, data] of Object.entries(stats.bySide)) {
    lines.push(`- ${side}: ${data.total} total, ${data.attending} attending`);
  }

  if (stats.dietaryRestrictions.length > 0) {
    const counts: Record<string, number> = {};
    for (const r of stats.dietaryRestrictions) {
      counts[r] = (counts[r] || 0) + 1;
    }
    lines.push("", "Dietary restrictions (attending guests):");
    for (const [restriction, count] of Object.entries(counts)) {
      lines.push(`- ${restriction}: ${count}`);
    }
  }

  lines.push(
    "",
    "Generate 3-5 insights based on this data. Focus on actionable items and notable patterns.",
  );

  return lines.join("\n");
}
