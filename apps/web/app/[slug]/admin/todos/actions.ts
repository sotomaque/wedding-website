"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getWeddingContext } from "@/lib/db/wedding-context";

export interface WeddingTodo {
  id: string;
  title: string;
  isCompleted: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function getTodos(): Promise<WeddingTodo[]> {
  try {
    const { weddingId } = await getWeddingContext();
    const todos = await db.weddingTodo.findMany({
      where: { weddingId },
      orderBy: [
        { isCompleted: "asc" },
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return todos;
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

    // Get the max displayOrder to place new todo at the end
    const result = await db.weddingTodo.aggregate({
      where: { weddingId },
      _max: { displayOrder: true },
    });

    const nextOrder = (result._max.displayOrder ?? 0) + 1;

    await db.weddingTodo.create({
      data: {
        title: trimmed,
        displayOrder: nextOrder,
        weddingId,
      },
    });

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
    const { slug } = await getWeddingContext();
    await db.weddingTodo.update({
      where: { id },
      data: { isCompleted },
    });

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
    const { slug } = await getWeddingContext();
    await db.weddingTodo.delete({ where: { id } });

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

    const { slug } = await getWeddingContext();
    await db.weddingTodo.update({
      where: { id },
      data: { title: trimmed },
    });

    revalidatePath(`/${slug}/admin/todos`);
    return { success: true };
  } catch (error) {
    console.error("Error updating todo:", error);
    return { success: false, error: "Failed to update todo" };
  }
}
