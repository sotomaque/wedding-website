import { type NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/client";
import {
  buildUserPrompt,
  systemPrompt,
  todoOutputSchema,
} from "@/lib/ai/prompts/todo";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getWeddingContext();
    const auth = await requireAdmin(ctx.weddingId);
    if ("status" in auth) return auth;

    const body = await request.json().catch(() => ({}));
    const customPrompt =
      typeof body.customPrompt === "string"
        ? body.customPrompt.trim()
        : undefined;

    const existingTodos = await db.weddingTodo.findMany({
      where: { weddingId: ctx.weddingId },
    });

    const result = await generateStructured(todoOutputSchema, {
      context: {
        weddingId: ctx.weddingId,
        weddingContext: ctx,
        feature: "todo-generator",
      },
      system: systemPrompt(ctx),
      prompt: buildUserPrompt({
        weddingDate: ctx.weddingDate,
        existingTodos: existingTodos.map((t) => t.title),
        customPrompt: customPrompt || undefined,
      }),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Filter out todos where monthsBefore would make them past due
    const now = new Date();
    const monthsUntilWedding =
      (ctx.weddingDate.getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24 * 30.44);

    const relevantTodos = result.data.todos.filter(
      (todo) => todo.monthsBefore <= monthsUntilWedding,
    );

    // Calculate displayOrder starting after the last existing todo
    const maxOrderResult = await db.weddingTodo.aggregate({
      where: { weddingId: ctx.weddingId },
      _max: { displayOrder: true },
    });
    const startOrder = (maxOrderResult._max.displayOrder ?? 0) + 1;

    await db.weddingTodo.createMany({
      data: relevantTodos.map((todo, index) => ({
        weddingId: ctx.weddingId,
        title: todo.title,
        displayOrder: startOrder + index,
        isCompleted: false,
      })),
    });

    return NextResponse.json({
      success: true,
      count: relevantTodos.length,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/ai/todos/generate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
