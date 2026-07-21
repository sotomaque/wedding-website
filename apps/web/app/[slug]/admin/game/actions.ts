"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";

type Result = { success: boolean; error?: string };

async function authorize(): Promise<
  { weddingId: string; slug: string } | { error: string }
> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized) return { error: auth.error ?? "Unauthorized" };
  return { weddingId, slug };
}

function refresh(slug: string) {
  revalidatePath(`/${slug}/admin/game`);
  revalidatePath(`/${slug}/game`, "layout");
}

/** Create the wedding's game if it doesn't have one yet. */
export async function createGame(): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  try {
    const existing = await db.game.findFirst({
      where: { weddingId: ctx.weddingId },
      select: { id: true },
    });
    if (existing) return { success: true };
    await db.game.create({
      data: {
        weddingId: ctx.weddingId,
        title: "The Newlywed Game",
        description: "Guess who's most likely to…",
        status: "draft",
        publicToken: randomUUID().replace(/-/g, ""),
      },
    });
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error creating game:", error);
    return { success: false, error: "Failed to create game" };
  }
}

export async function updateGameMeta(
  gameId: string,
  data: { title?: string; description?: string | null },
): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  try {
    const res = await db.game.updateMany({
      where: { id: gameId, weddingId: ctx.weddingId },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        updatedAt: new Date(),
      },
    });
    if (res.count === 0) return { success: false, error: "Game not found" };
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error updating game:", error);
    return { success: false, error: "Failed to update game" };
  }
}

export async function setGameStatus(
  gameId: string,
  status: "draft" | "open" | "closed",
): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  try {
    const res = await db.game.updateMany({
      where: { id: gameId, weddingId: ctx.weddingId },
      data: { status, updatedAt: new Date() },
    });
    if (res.count === 0) return { success: false, error: "Game not found" };
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error setting game status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function addQuestion(
  gameId: string,
  prompt: string,
): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  const trimmed = prompt.trim();
  if (!trimmed) return { success: false, error: "Question can't be empty" };
  try {
    const game = await db.game.findFirst({
      where: { id: gameId, weddingId: ctx.weddingId },
      select: { id: true },
    });
    if (!game) return { success: false, error: "Game not found" };
    const max = await db.gameQuestion.aggregate({
      where: { gameId },
      _max: { displayOrder: true },
    });
    await db.gameQuestion.create({
      data: {
        gameId,
        weddingId: ctx.weddingId,
        prompt: trimmed,
        displayOrder: (max._max.displayOrder ?? 0) + 1,
      },
    });
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error adding question:", error);
    return { success: false, error: "Failed to add question" };
  }
}

export async function updateQuestion(
  questionId: string,
  prompt: string,
): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  const trimmed = prompt.trim();
  if (!trimmed) return { success: false, error: "Question can't be empty" };
  try {
    const res = await db.gameQuestion.updateMany({
      where: { id: questionId, weddingId: ctx.weddingId },
      data: { prompt: trimmed },
    });
    if (res.count === 0) return { success: false, error: "Question not found" };
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error updating question:", error);
    return { success: false, error: "Failed to update question" };
  }
}

export async function deleteQuestion(questionId: string): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  try {
    await db.gameQuestion.deleteMany({
      where: { id: questionId, weddingId: ctx.weddingId },
    });
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error deleting question:", error);
    return { success: false, error: "Failed to delete question" };
  }
}

export async function addOption(
  questionId: string,
  label: string,
): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  const trimmed = label.trim();
  if (!trimmed) return { success: false, error: "Option can't be empty" };
  try {
    const question = await db.gameQuestion.findFirst({
      where: { id: questionId, weddingId: ctx.weddingId },
      select: { id: true },
    });
    if (!question) return { success: false, error: "Question not found" };
    const max = await db.gameOption.aggregate({
      where: { questionId },
      _max: { displayOrder: true },
    });
    await db.gameOption.create({
      data: {
        questionId,
        weddingId: ctx.weddingId,
        label: trimmed,
        displayOrder: (max._max.displayOrder ?? 0) + 1,
      },
    });
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error adding option:", error);
    return { success: false, error: "Failed to add option" };
  }
}

export async function updateOption(
  optionId: string,
  label: string,
): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  const trimmed = label.trim();
  if (!trimmed) return { success: false, error: "Option can't be empty" };
  try {
    const res = await db.gameOption.updateMany({
      where: { id: optionId, weddingId: ctx.weddingId },
      data: { label: trimmed },
    });
    if (res.count === 0) return { success: false, error: "Option not found" };
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error updating option:", error);
    return { success: false, error: "Failed to update option" };
  }
}

export async function deleteOption(optionId: string): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  try {
    // The correct_option_id FK is ON DELETE SET NULL, so removing a chosen
    // answer simply un-reveals that question.
    await db.gameOption.deleteMany({
      where: { id: optionId, weddingId: ctx.weddingId },
    });
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error deleting option:", error);
    return { success: false, error: "Failed to delete option" };
  }
}

/** Reveal (or clear) the correct answer for a question. */
export async function setCorrectOption(
  questionId: string,
  optionId: string | null,
): Promise<Result> {
  const ctx = await authorize();
  if ("error" in ctx) return { success: false, error: ctx.error };
  try {
    // When setting, verify the option belongs to this question (and wedding).
    if (optionId) {
      const option = await db.gameOption.findFirst({
        where: { id: optionId, questionId, weddingId: ctx.weddingId },
        select: { id: true },
      });
      if (!option)
        return { success: false, error: "That option isn't on this question" };
    }
    const res = await db.gameQuestion.updateMany({
      where: { id: questionId, weddingId: ctx.weddingId },
      data: { correctOptionId: optionId },
    });
    if (res.count === 0) return { success: false, error: "Question not found" };
    refresh(ctx.slug);
    return { success: true };
  } catch (error) {
    console.error("Error setting correct option:", error);
    return { success: false, error: "Failed to set the answer" };
  }
}
