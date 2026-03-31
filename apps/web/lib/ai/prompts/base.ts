import type { WeddingContext } from "@/lib/db/wedding-context";

/**
 * Build a system prompt with wedding context injected.
 * Every AI feature uses this as the prefix for its system prompt.
 */
export function buildSystemPrompt(
  ctx: WeddingContext,
  featureInstructions: string,
  extras?: string,
): string {
  const weddingDate = ctx.weddingDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const now = new Date();
  const daysUntil = Math.ceil(
    (ctx.weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  const lines: string[] = [
    `You are an AI assistant for a wedding planning platform. You are helping with the wedding of ${ctx.coupleName}, scheduled for ${weddingDate} (${daysUntil > 0 ? `${daysUntil} days from now` : "date has passed"}, timezone: ${ctx.timezone}).`,
  ];

  // Couple identity
  if (ctx.person1Name || ctx.person2Name) {
    const parts: string[] = [];
    if (ctx.person1Name) parts.push(ctx.person1Name);
    if (ctx.person2Name) parts.push(ctx.person2Name);
    lines.push(
      `The couple: ${parts.join(" and ")}. When the admin says "my friend" or "my side", they are one of these people — determine which based on context and assign the correct side (bride/groom).`,
    );
  }

  // RSVP deadline
  if (ctx.rsvpDeadline) {
    lines.push(`RSVP deadline: ${ctx.rsvpDeadline}.`);
  }

  // Enabled features
  const enabledFeatures = Object.entries(ctx.featureToggles)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  if (enabledFeatures.length > 0) {
    lines.push(
      `Enabled features: ${enabledFeatures.join(", ")}. Only reference features that are enabled.`,
    );
  }

  lines.push("");
  lines.push(featureInstructions);

  if (extras) {
    lines.push("");
    lines.push(extras);
  }

  return lines.join("\n");
}
