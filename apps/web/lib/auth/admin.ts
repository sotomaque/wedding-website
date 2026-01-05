import { currentUser } from "@clerk/nextjs/server";
import { env } from "@/env";

export interface AdminAuthResult {
  authorized: boolean;
  error: string | null;
}

/**
 * Check if the current user is an admin based on their email.
 * Used by admin API routes for authorization.
 */
export async function isAdmin(): Promise<AdminAuthResult> {
  const user = await currentUser();
  if (!user) return { authorized: false, error: "Unauthorized" };

  const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
    e.trim().toLowerCase(),
  );
  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

  if (!adminEmails?.includes(userEmail || "")) {
    return { authorized: false, error: "Forbidden" };
  }

  return { authorized: true, error: null };
}
