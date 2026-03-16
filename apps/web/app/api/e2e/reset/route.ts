import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { resetAndSeed } from "@/lib/db/seed";

/**
 * POST /api/e2e/reset
 *
 * Resets the database and seeds deterministic test data.
 * Only available on Vercel preview deployments, protected by multiple guards.
 */
export async function POST(request: NextRequest) {
  // Guard 1: Only available on preview deployments or explicit local E2E mode
  const isPreview = env.VERCEL_ENV === "preview";
  const isLocalE2E = env.LOCAL_E2E_MODE === "true";

  if (!isPreview && !isLocalE2E) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Guard 2: Verify database URL does not point to production
  // Supabase branching uses a different project ref for preview branches
  const dbUrl = env.POSTGRES_URL ?? env.DATABASE_URL ?? "";
  const prodProjectRef = "yjezfveooxxggzsnaray";
  if (dbUrl.includes(prodProjectRef)) {
    console.error(
      "SAFETY: Refusing to reset — database URL points to production project",
    );
    return NextResponse.json(
      { error: "Refusing to reset production database" },
      { status: 403 },
    );
  }

  // Guard 3: Require shared secret
  const token = request.headers.get("x-e2e-reset-token");
  if (!env.E2E_RESET_SECRET || token !== env.E2E_RESET_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await resetAndSeed();
    return NextResponse.json({ status: "reset" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error resetting database:", error);
    return NextResponse.json(
      { error: "Failed to reset database", detail: message },
      { status: 500 },
    );
  }
}
