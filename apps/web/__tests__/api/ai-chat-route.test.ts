import { describe, expect, it } from "bun:test";
import { z } from "zod";

/**
 * Tests for the AI chat route's Zod validation schema.
 * Extracted here to test the schema logic without needing to mock the full route.
 */
const requestSchema = z.object({
  messages: z
    .array(
      z.looseObject({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.record(z.string(), z.unknown())),
      }),
    )
    .min(1, "At least one message is required"),
});

describe("AI Chat Route - Request Validation", () => {
  describe("valid requests", () => {
    it("accepts a single user message with text part", () => {
      const result = requestSchema.safeParse({
        messages: [
          {
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts multiple messages with different roles", () => {
      const result = requestSchema.safeParse({
        messages: [
          {
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
          },
          {
            id: "msg-2",
            role: "assistant",
            parts: [{ type: "text", text: "Hi there!" }],
          },
          {
            id: "msg-3",
            role: "user",
            parts: [{ type: "text", text: "How many guests?" }],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts messages with tool-call parts (extra fields pass through)", () => {
      const result = requestSchema.safeParse({
        messages: [
          {
            id: "msg-1",
            role: "assistant",
            parts: [
              {
                type: "tool-getRsvpStats",
                toolName: "getRsvpStats",
                toolCallId: "call-1",
                state: "output-available",
                input: {},
                output: { total: 10 },
              },
            ],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("preserves extra fields on messages via looseObject", () => {
      const result = requestSchema.safeParse({
        messages: [
          {
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: "Hi" }],
            createdAt: "2026-01-01T00:00:00Z",
            metadata: { foo: "bar" },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const msg = result.data.messages[0];
        expect((msg as Record<string, unknown>).createdAt).toBe(
          "2026-01-01T00:00:00Z",
        );
      }
    });

    it("accepts system role messages", () => {
      const result = requestSchema.safeParse({
        messages: [
          {
            id: "msg-1",
            role: "system",
            parts: [{ type: "text", text: "You are a wedding assistant" }],
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid requests", () => {
    it("rejects empty messages array", () => {
      const result = requestSchema.safeParse({ messages: [] });
      expect(result.success).toBe(false);
    });

    it("rejects missing messages field", () => {
      const result = requestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects messages without id", () => {
      const result = requestSchema.safeParse({
        messages: [
          {
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects messages without role", () => {
      const result = requestSchema.safeParse({
        messages: [
          {
            id: "msg-1",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid role values", () => {
      const result = requestSchema.safeParse({
        messages: [
          {
            id: "msg-1",
            role: "admin",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects messages without parts", () => {
      const result = requestSchema.safeParse({
        messages: [{ id: "msg-1", role: "user" }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-array messages", () => {
      const result = requestSchema.safeParse({ messages: "hello" });
      expect(result.success).toBe(false);
    });

    it("rejects non-object parts", () => {
      const result = requestSchema.safeParse({
        messages: [
          {
            id: "msg-1",
            role: "user",
            parts: ["hello"],
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});
