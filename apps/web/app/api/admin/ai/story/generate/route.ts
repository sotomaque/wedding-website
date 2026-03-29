import { type NextRequest, NextResponse } from "next/server";
import { createTextStream } from "@/lib/ai/client";
import { buildUserPrompt, systemPrompt } from "@/lib/ai/prompts/story";
import { requireAdmin } from "@/lib/auth/admin";
import { getWeddingContext } from "@/lib/db/wedding-context";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getWeddingContext();
    const auth = await requireAdmin(ctx.weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { bulletPoints, tone = "romantic" } = body as {
      bulletPoints: string;
      tone?: "romantic" | "humorous" | "formal" | "casual";
    };

    if (!bulletPoints?.trim()) {
      return NextResponse.json(
        { error: "bulletPoints is required" },
        { status: 400 },
      );
    }

    const result = createTextStream({
      context: {
        weddingId: ctx.weddingId,
        weddingContext: ctx,
        feature: "story-writer",
      },
      system: systemPrompt(ctx),
      prompt: buildUserPrompt({
        bulletPoints,
        tone,
        coupleName: ctx.coupleName,
      }),
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in POST /api/admin/ai/story/generate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
