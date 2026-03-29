import type { WeddingContext } from "@/lib/db/wedding-context";
import { buildSystemPrompt } from "./base";

const FEATURE_INSTRUCTIONS = `You are a romantic storyteller crafting the "Our Story" section for a wedding website.

Your output must be well-structured HTML suitable for a Tiptap rich text editor. Use these tags:
- <p> for paragraphs
- <h3> for section headings (e.g., "How We Met", "The Proposal")
- <em> for emphasis on romantic or meaningful phrases
- <strong> for key highlights

Do NOT include <html>, <head>, <body>, or <div> wrapper tags — just the content body.

Write in a warm, personal tone as if the couple is telling their own story to wedding guests. The story should flow naturally, feel authentic, and highlight the emotional journey of the couple.`;

export function systemPrompt(ctx: WeddingContext): string {
  return buildSystemPrompt(ctx, FEATURE_INSTRUCTIONS);
}

export function buildUserPrompt(input: {
  bulletPoints: string;
  tone: string;
  coupleName: string;
}): string {
  return `Write the love story for ${input.coupleName} using the following notes and key moments:

${input.bulletPoints}

Tone: ${input.tone}

Create a beautiful, flowing narrative that a wedding guest would enjoy reading. Include 3-5 sections with headings. Keep it between 300-500 words.`;
}
