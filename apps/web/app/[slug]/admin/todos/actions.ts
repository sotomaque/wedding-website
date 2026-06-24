"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
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

/**
 * Resolve the current wedding and assert the caller is an admin for it.
 *
 * Server Actions are independently-invocable POST endpoints, so they must
 * authorize on their own — the admin layout/middleware does not protect them.
 */
async function authorizeWedding(): Promise<
  { weddingId: string; slug: string } | { error: string }
> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized) return { error: auth.error ?? "Unauthorized" };
  return { weddingId, slug };
}

export async function getTodos(): Promise<WeddingTodo[]> {
  try {
    const authz = await authorizeWedding();
    if ("error" in authz) throw new Error(authz.error);
    const { weddingId } = authz;
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
  const authz = await authorizeWedding();
  if ("error" in authz) return { success: false, error: authz.error };
  const { weddingId, slug } = authz;

  try {
    const trimmed = title.trim();
    if (!trimmed) {
      return { success: false, error: "Title is required" };
    }

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
  const authz = await authorizeWedding();
  if ("error" in authz) return { success: false, error: authz.error };
  const { weddingId, slug } = authz;

  try {
    const result = await db.weddingTodo.updateMany({
      where: { id, weddingId },
      data: { isCompleted },
    });

    if (result.count === 0) {
      return { success: false, error: "Todo not found" };
    }

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
  const authz = await authorizeWedding();
  if ("error" in authz) return { success: false, error: authz.error };
  const { weddingId, slug } = authz;

  try {
    const result = await db.weddingTodo.deleteMany({
      where: { id, weddingId },
    });

    if (result.count === 0) {
      return { success: false, error: "Todo not found" };
    }

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
  const authz = await authorizeWedding();
  if ("error" in authz) return { success: false, error: authz.error };
  const { weddingId, slug } = authz;

  try {
    const trimmed = title.trim();
    if (!trimmed) {
      return { success: false, error: "Title is required" };
    }

    const result = await db.weddingTodo.updateMany({
      where: { id, weddingId },
      data: { title: trimmed },
    });

    if (result.count === 0) {
      return { success: false, error: "Todo not found" };
    }

    revalidatePath(`/${slug}/admin/todos`);
    return { success: true };
  } catch (error) {
    console.error("Error updating todo:", error);
    return { success: false, error: "Failed to update todo" };
  }
}
