import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, streamText } from "ai";
import type { z } from "zod";
import { env } from "@/env";
import type { AIRequestContext, AIResult } from "./types";

let _openai: ReturnType<typeof createOpenAI> | null = null;

function getOpenAI() {
  if (!_openai) {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    _openai = createOpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
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
    const result = await generateText({
      model: getModel(),
      output: Output.object({ schema }),
      system: options.system,
      prompt: options.prompt,
      temperature: options.context.temperature ?? 0.7,
      maxOutputTokens: options.context.maxTokens ?? 4000,
    });

    return { success: true, data: result.output as T };
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
 * Used for: Story Writer (prompt mode), Planning Assistant (messages + tools mode).
 * Returns the stream result for use with toUIMessageStreamResponse() or toTextStreamResponse().
 */
export function createTextStream(options: {
  context: AIRequestContext;
  system: string;
  prompt?: string;
  // biome-ignore lint/suspicious/noExplicitAny: AI SDK ModelMessage type is complex
  messages?: any[];
  // biome-ignore lint/suspicious/noExplicitAny: AI SDK tools type is complex
  tools?: any;
  // biome-ignore lint/suspicious/noExplicitAny: AI SDK StopCondition type is complex
  stopWhen?: any;
  // biome-ignore lint/suspicious/noExplicitAny: AI SDK stream return type is complex
}): any {
  const base = {
    model: getModel(),
    system: options.system,
    temperature: options.context.temperature ?? 0.7,
  } as Record<string, unknown>;

  if (options.prompt) base.prompt = options.prompt;
  if (options.messages) base.messages = options.messages;
  if (options.tools) base.tools = options.tools;
  if (options.stopWhen) base.stopWhen = options.stopWhen;

  // biome-ignore lint/suspicious/noExplicitAny: dynamic config built from options
  return streamText(base as any);
}
