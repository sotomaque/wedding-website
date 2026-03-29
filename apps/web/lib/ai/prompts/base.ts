import type { WeddingContext } from "@/lib/db/wedding-context";

/**
 * Build a system prompt with wedding context injected.
 * Every AI feature uses this as the prefix for its system prompt.
 */
export function buildSystemPrompt(
  ctx: WeddingContext,
  featureInstructions: string,
): string {
  const weddingDate = ctx.weddingDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are an AI assistant for a wedding planning platform. You are helping with the wedding of ${ctx.coupleName}, scheduled for ${weddingDate} (timezone: ${ctx.timezone}).

${featureInstructions}`;
}
