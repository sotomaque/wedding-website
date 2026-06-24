import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getVerifiedPrimaryEmail } from "@/lib/auth/clerk-user";
import { db } from "@/lib/db";

export interface AdminAuthResult {
  authorized: boolean;
  error: string | null;
  /** The admin's role for the specific wedding, if applicable */
  role: "owner" | "editor" | "superadmin" | null;
}

/**
 * Check if the current user is an admin for the given wedding.
 *
 * Checks ADMIN_EMAILS env var first (superadmin override — global access),
 * then the `wedding_admins` table for per-wedding access.
 *
 * `weddingId` is required to prevent the "forgot to pass it" footgun
 * that silently denies per-wedding admins. If you genuinely want a
 * superadmin-only check, resolve the wedding context anyway and pass it —
 * the superadmin path runs first and short-circuits.
 */
export async function isAdmin(weddingId: string): Promise<AdminAuthResult> {
  const user = await currentUser();
  if (!user) return { authorized: false, error: "Unauthorized", role: null };

  // Use the verified PRIMARY email only — never emailAddresses[0], which may be
  // an unverified address the user added (auth-bypass vector).
  const userEmail = getVerifiedPrimaryEmail(user);
  if (!userEmail)
    return { authorized: false, error: "Unauthorized", role: null };

  // Superadmin check: ADMIN_EMAILS env var (global access to all weddings)
  const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
    e.trim().toLowerCase(),
  );
  if (adminEmails?.includes(userEmail)) {
    return { authorized: true, error: null, role: "superadmin" };
  }

  // Per-wedding check: wedding_admins table
  const admin = await db.weddingAdmin.findFirst({
    where: {
      weddingId,
      OR: [{ email: userEmail }, { clerkUserId: user.id }],
    },
    select: { role: true },
  });

  if (admin) {
    return {
      authorized: true,
      error: null,
      role: admin.role as "owner" | "editor",
    };
  }

  return { authorized: false, error: "Forbidden", role: null };
}

/**
 * Convenience helper for API routes. Returns a NextResponse error
 * if the user is not an admin, or the auth result if they are.
 *
 * Usage:
 *   const auth = await requireAdmin(weddingId)
 *   if ("status" in auth) return auth
 *   // auth.role is available here
 */
export async function requireAdmin(
  weddingId: string,
): Promise<
  NextResponse | { authorized: true; role: "owner" | "editor" | "superadmin" }
> {
  const result = await isAdmin(weddingId);
  if (!result.authorized) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Unauthorized" ? 401 : 403 },
    );
  }
  return {
    authorized: true,
    role: result.role as "owner" | "editor" | "superadmin",
  };
}
