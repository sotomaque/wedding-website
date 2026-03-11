import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { resetAndSeed } from "@/lib/db/seed";

/**
 * POST /api/e2e/reset
 *
 * Resets the database and seeds deterministic test data.
 * Only available on Vercel preview deployments, protected by a shared secret.
 */
export async function POST(request: NextRequest) {
  // Guard 1: Only available on preview deployments
  if (env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Guard 2: Require shared secret
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
