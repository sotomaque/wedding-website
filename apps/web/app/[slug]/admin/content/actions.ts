"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

export async function updateWeddingContent(
  section: string,
  content: Record<string, unknown>,
) {
  const jsonContent = content as unknown as Prisma.InputJsonValue;
  const auth = await isAdmin();
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const weddingId = await getWeddingId();

    await db.weddingContent.upsert({
      where: { weddingId_section: { weddingId, section } },
      update: { content: jsonContent, updatedAt: new Date() },
      create: { weddingId, section, content: jsonContent },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(`Error updating wedding content (${section}):`, error);
    return { success: false, error: `Failed to update ${section} content` };
  }
}
