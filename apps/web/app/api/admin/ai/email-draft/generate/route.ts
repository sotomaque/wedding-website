import { type NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/client";
import {
  buildUserPrompt,
  emailDraftSchema,
  systemPrompt,
} from "@/lib/ai/prompts/email-draft";
import { requireAdmin } from "@/lib/auth/admin";
import { getWeddingContext } from "@/lib/db/wedding-context";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getWeddingContext();
    const auth = await requireAdmin(ctx.weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const {
      templateType,
      intent,
      variables = [],
      currentSubject,
    } = body as {
      templateType: string;
      intent: string;
      variables: Array<{ key: string; description?: string }>;
      currentSubject?: string;
    };

    if (!intent?.trim()) {
      return NextResponse.json(
        { error: "intent is required" },
        { status: 400 },
      );
    }

    const result = await generateStructured(emailDraftSchema, {
      context: {
        weddingId: ctx.weddingId,
        weddingContext: ctx,
        feature: "email-draft",
      },
      system: systemPrompt(ctx),
      prompt: buildUserPrompt({
        templateType,
        intent,
        variables,
        currentSubject,
      }),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/ai/email-draft/generate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
