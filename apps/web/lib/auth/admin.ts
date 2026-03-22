import { currentUser } from "@clerk/nextjs/server";
import { env } from "@/env";
import { db } from "@/lib/db";

export interface AdminAuthResult {
  authorized: boolean;
  error: string | null;
  /** The admin's role for the specific wedding, if applicable */
  role: "owner" | "editor" | "superadmin" | null;
}

/**
 * Check if the current user is an admin.
 *
 * When `weddingId` is provided, checks the `wedding_admins` table for
 * per-wedding access. Always falls back to `ADMIN_EMAILS` env var as
 * a superadmin override.
 *
 * Existing call sites that don't pass `weddingId` continue to work
 * (backward compat — checks ADMIN_EMAILS only).
 */
export async function isAdmin(weddingId?: string): Promise<AdminAuthResult> {
  const user = await currentUser();
  if (!user) return { authorized: false, error: "Unauthorized", role: null };

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!userEmail)
    return { authorized: false, error: "Unauthorized", role: null };

  // Superadmin check: ADMIN_EMAILS env var (global access to all weddings)
  const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
    e.trim().toLowerCase(),
  );
  if (adminEmails?.includes(userEmail)) {
    return { authorized: true, error: null, role: "superadmin" };
  }

  // Per-wedding check: wedding_admins table (raw query — model not yet in Prisma schema)
  if (weddingId) {
    const admins = await db.$queryRaw<
      { role: string }[]
    >`SELECT role FROM wedding_admins WHERE wedding_id = ${weddingId}::uuid AND (email = ${userEmail} OR clerk_user_id = ${user.id}) LIMIT 1`;

    if (admins.length > 0) {
      return {
        authorized: true,
        error: null,
        role: admins[0]!.role as "owner" | "editor",
      };
    }
  }

  return { authorized: false, error: "Forbidden", role: null };
}
