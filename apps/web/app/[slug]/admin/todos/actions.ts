"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
import { getWeddingContext, getWeddingId } from "@/lib/db/wedding-context";

export interface WeddingTodo {
  id: string;
  title: string;
  is_completed: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export async function getTodos(): Promise<WeddingTodo[]> {
  try {
    const weddingId = await getWeddingId();
    const todos = await db
      .selectFrom("wedding_todos")
      .where("wedding_id", "=", weddingId)
      .selectAll()
      .orderBy("is_completed", "asc")
      .orderBy("display_order", "asc")
      .orderBy("created_at", "desc")
      .execute();

    // biome-ignore lint/suspicious/noExplicitAny: Date objects are serialized to strings in server actions
    return todos as any;
  } catch (error) {
    console.error("Error fetching todos:", error);
    throw error;
  }
}

export async function addTodo(
  title: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = title.trim();
    if (!trimmed) {
      return { success: false, error: "Title is required" };
    }

    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);

    // Get the max display_order to place new todo at the end
    const last = await db
      .selectFrom("wedding_todos")
      .where("wedding_id", "=", weddingId)
      .select(db.fn.max("display_order").as("max_order"))
      .executeTakeFirst();

    const nextOrder = (Number(last?.max_order) || 0) + 1;

    await weddingDb
      .insertInto("wedding_todos", {
        title: trimmed,
        display_order: nextOrder,
      })
      .execute();
    revalidatePath(`/${slug}/admin/todos`);
    return { success: true };
  } catch (error) {
    console.error("Error adding todo:", error);
    return { success: false, error: "Failed to add todo" };
  }
}

export async function toggleTodo(
  id: string,
  isCompleted: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);

    await weddingDb
      .updateTable("wedding_todos")
      .set({
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .execute();
    revalidatePath(`/${slug}/admin/todos`);
    return { success: true };
  } catch (error) {
    console.error("Error toggling todo:", error);
    return { success: false, error: "Failed to update todo" };
  }
}

export async function deleteTodo(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);

    await weddingDb.deleteFrom("wedding_todos").where("id", "=", id).execute();
    revalidatePath(`/${slug}/admin/todos`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting todo:", error);
    return { success: false, error: "Failed to delete todo" };
  }
}

export async function updateTodoTitle(
  id: string,
  title: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = title.trim();
    if (!trimmed) {
      return { success: false, error: "Title is required" };
    }

    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);

    await weddingDb
      .updateTable("wedding_todos")
      .set({
        title: trimmed,
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .execute();
    revalidatePath(`/${slug}/admin/todos`);
    return { success: true };
  } catch (error) {
    console.error("Error updating todo:", error);
    return { success: false, error: "Failed to update todo" };
  }
}
