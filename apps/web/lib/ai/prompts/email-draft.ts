import { z } from "zod";
import type { WeddingContext } from "@/lib/db/wedding-context";
import { buildSystemPrompt } from "./base";

export const emailDraftSchema = z.object({
  subject: z.string(),
  htmlBody: z.string(),
});

const FEATURE_INSTRUCTIONS = `You generate professional email HTML for a wedding website platform.

IMPORTANT: Template variables use triple-brace Mustache syntax: {{{VARIABLE_NAME}}}
These variables are replaced at send-time with actual values. You MUST include them exactly as provided — do not invent new variables or omit required ones.

Your output must be valid inline-styled HTML suitable for email clients:
- Use table-based layout for structure
- Use inline styles on every element (no <style> blocks or CSS classes)
- Use web-safe fonts (Arial, Helvetica, Georgia, Times New Roman)
- Keep the design clean, elegant, and appropriate for a wedding
- Use a max-width of 600px for the main container
- Include proper padding and spacing
- Use a color palette that feels warm and celebratory

The HTML should render correctly in Gmail, Outlook, Apple Mail, and other major email clients.`;

export function systemPrompt(ctx: WeddingContext): string {
  return buildSystemPrompt(ctx, FEATURE_INSTRUCTIONS);
}

export function buildUserPrompt(input: {
  templateType: string;
  intent: string;
  variables: Array<{ key: string; description?: string }>;
  currentSubject?: string;
}): string {
  const variablesList = input.variables
    .map((v) => `- {{{${v.key}}}}${v.description ? `: ${v.description}` : ""}`)
    .join("\n");

  let prompt = `Generate an email for template type: ${input.templateType}

Available template variables (you MUST use these where appropriate):
${variablesList}

The email should: ${input.intent}`;

  if (input.currentSubject) {
    prompt += `\n\nCurrent subject for reference: "${input.currentSubject}"`;
  }

  return prompt;
}
