export const maxDuration = 60;

import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getModel } from "@/lib/ai/client";
import { systemPrompt } from "@/lib/ai/prompts/chat";
import { createWeddingTools } from "@/lib/ai/tools/wedding-tools";
import { requireAdmin } from "@/lib/auth/admin";
import { getWeddingContext } from "@/lib/db/wedding-context";

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

export async function POST(request: Request) {
  try {
    const ctx = await getWeddingContext();
    const auth = await requireAdmin(ctx.weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const modelMessages = await convertToModelMessages(
      // biome-ignore lint/suspicious/noExplicitAny: validated above, convertToModelMessages needs full UIMessage shape
      parsed.data.messages as any[],
    );
    const tools = createWeddingTools(ctx.weddingId);
    const system = systemPrompt(ctx);

    const result = streamText({
      model: getModel(),
      system,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in POST /api/admin/ai/chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
