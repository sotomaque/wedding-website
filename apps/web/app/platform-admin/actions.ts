"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { db } from "@/lib/db";

async function verifySuperAdmin() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  const superAdmins =
    env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];

  if (!userEmail || !superAdmins.includes(userEmail)) {
    redirect("/dashboard");
  }

  return user;
}

export async function updateWeddingStatus(weddingId: string, status: string) {
  try {
    await verifySuperAdmin();

    const validStatuses = ["draft", "published", "archived"];
    if (!validStatuses.includes(status)) {
      return { success: false, error: "Invalid status" };
    }

    await db.wedding.update({
      where: { id: weddingId },
      data: { status: status as "draft" | "published" | "archived" },
    });

    revalidatePath("/platform-admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update wedding status:", error);
    return { success: false, error: "Failed to update wedding status" };
  }
}

export async function deleteWedding(weddingId: string) {
  try {
    await verifySuperAdmin();

    await db.wedding.delete({
      where: { id: weddingId },
    });

    revalidatePath("/platform-admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete wedding:", error);
    return { success: false, error: "Failed to delete wedding" };
  }
}
