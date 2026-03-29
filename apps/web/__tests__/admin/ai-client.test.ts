import { beforeEach, describe, expect, it, mock } from "bun:test";

// Track what generateText was called with
let capturedGenerateTextArgs: Record<string, unknown> | null = null;

// Mock env
mock.module("@/env", () => ({
  env: {
    POSTGRES_URL: undefined,
    DATABASE_URL: "postgresql://test",
    OPENAI_API_KEY: "test-key",
    ADMIN_EMAILS: "admin@example.com",
  },
}));

// Mock @ai-sdk/openai
const mockModelFn = mock(() => "mock-model-instance");
mock.module("@ai-sdk/openai", () => ({
  createOpenAI: mock(() => mockModelFn),
}));

// Get real ai module exports to preserve them, then override what we need
const realAi = await import("ai");
mock.module("ai", () => ({
  ...realAi,
  generateText: mock(async (args: Record<string, unknown>) => {
    capturedGenerateTextArgs = args;
    return { output: { title: "Test Todo", done: false }, text: "" };
  }),
  Output: {
    object: mock(({ schema }: { schema: unknown }) => ({
      _type: "Output.object",
      schema,
    })),
  },
  streamText: mock(() => ({
    toUIMessageStreamResponse: mock(() => new Response()),
  })),
}));

// Import after mocks
const { generateStructured } = await import("@/lib/ai/client");

// We need zod for test schemas
const { z } = await import("zod");

describe("AI Client - generateStructured", () => {
  const defaultContext = {
    weddingId: "test-wedding",
    feature: "test" as const,
    temperature: 0.5,
    maxTokens: 2000,
  };

  beforeEach(() => {
    capturedGenerateTextArgs = null;
  });

  it("uses generateText with Output.object (not generateObject)", async () => {
    const schema = z.object({
      title: z.string(),
      done: z.boolean(),
    });

    await generateStructured(schema, {
      context: defaultContext,
      system: "You are a test assistant",
      prompt: "Generate a todo",
    });

    expect(capturedGenerateTextArgs).not.toBeNull();
    // Verify it passes output with Output.object wrapper
    expect(capturedGenerateTextArgs!.output).toBeDefined();
    expect(
      (capturedGenerateTextArgs!.output as Record<string, unknown>)._type,
    ).toBe("Output.object");
  });

  it("passes system, prompt, temperature, and maxOutputTokens", async () => {
    const schema = z.object({ name: z.string() });

    await generateStructured(schema, {
      context: defaultContext,
      system: "Test system prompt",
      prompt: "Test user prompt",
    });

    expect(capturedGenerateTextArgs!.system).toBe("Test system prompt");
    expect(capturedGenerateTextArgs!.prompt).toBe("Test user prompt");
    expect(capturedGenerateTextArgs!.temperature).toBe(0.5);
    expect(capturedGenerateTextArgs!.maxOutputTokens).toBe(2000);
  });

  it("defaults temperature to 0.7 and maxTokens to 4000", async () => {
    const schema = z.object({ name: z.string() });

    await generateStructured(schema, {
      context: {
        weddingId: "test",
        feature: "test" as const,
      },
      system: "sys",
      prompt: "prompt",
    });

    expect(capturedGenerateTextArgs!.temperature).toBe(0.7);
    expect(capturedGenerateTextArgs!.maxOutputTokens).toBe(4000);
  });

  it("returns success with data from result.output", async () => {
    const schema = z.object({
      title: z.string(),
      done: z.boolean(),
    });

    const result = await generateStructured(schema, {
      context: defaultContext,
      system: "sys",
      prompt: "prompt",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ title: "Test Todo", done: false });
    }
  });

  it("returns error on failure", async () => {
    // Override generateText to throw for this test
    const { generateText } = await import("ai");
    const mockGenerate = generateText as unknown as ReturnType<typeof mock>;
    mockGenerate.mockRejectedValueOnce(new Error("API rate limited"));

    // Suppress expected console.error from generateStructured's catch block
    const originalError = console.error;
    console.error = mock(() => {});

    const schema = z.object({ name: z.string() });

    const result = await generateStructured(schema, {
      context: defaultContext,
      system: "sys",
      prompt: "prompt",
    });

    console.error = originalError;

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("API rate limited");
    }
  });
});
