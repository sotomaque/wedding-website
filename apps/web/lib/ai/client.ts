import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText, streamText } from "ai";
import type { z } from "zod";
import { env } from "@/env";
import type { AIRequestContext, AIResult } from "./types";

let _openai: ReturnType<typeof createOpenAI> | null = null;

function getOpenAI() {
  if (!_openai) {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    _openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _openai;
}

// biome-ignore lint/suspicious/noExplicitAny: AI SDK return type is complex and not portable
export function getModel(modelId = "gpt-4o"): any {
  return getOpenAI()(modelId);
}

/**
 * Generate a structured output validated against a Zod schema.
 * Used for: Todo Generator, Email Drafts, Seating Chart, Budget Optimizer.
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  options: {
    context: AIRequestContext;
    system: string;
    prompt: string;
  },
): Promise<AIResult<T>> {
  try {
    const result = await generateObject({
      model: getModel(),
      schema,
      system: options.system,
      prompt: options.prompt,
      temperature: options.context.temperature ?? 0.7,
      maxOutputTokens: options.context.maxTokens ?? 4000,
    });

    return { success: true, data: result.object };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI generation failed";
    console.error(
      `[AI:${options.context.feature}] Error for wedding ${options.context.weddingId}:`,
      error,
    );
    return { success: false, error: message };
  }
}

/**
 * Generate a plain text response.
 * Used for: Photo captions, one-shot text generation.
 */
export async function generateTextResult(options: {
  context: AIRequestContext;
  system: string;
  prompt: string;
}): Promise<AIResult<string>> {
  try {
    const result = await generateText({
      model: getModel(),
      system: options.system,
      prompt: options.prompt,
      temperature: options.context.temperature ?? 0.7,
      maxOutputTokens: options.context.maxTokens ?? 4000,
    });

    return { success: true, data: result.text };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI generation failed";
    console.error(
      `[AI:${options.context.feature}] Error for wedding ${options.context.weddingId}:`,
      error,
    );
    return { success: false, error: message };
  }
}

/**
 * Create a streaming text response.
 * Used for: Story Writer, Planning Assistant.
 * Returns the stream result for use with toTextStreamResponse().
 */
// biome-ignore lint/suspicious/noExplicitAny: AI SDK stream return type is complex and not portable
export function createTextStream(options: {
  context: AIRequestContext;
  system: string;
  prompt: string;
}): any {
  return streamText({
    model: getModel(),
    system: options.system,
    prompt: options.prompt,
    temperature: options.context.temperature ?? 0.7,
  });
}
