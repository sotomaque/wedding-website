import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { getWeddingId } from "@/lib/db/wedding-context";
import spec from "@/lib/openapi/openapi.json";

export const dynamic = "force-dynamic";

/**
 * Serve the OpenAPI spec behind auth. It used to live in public/openapi.json,
 * a world-readable static asset that disclosed the entire admin API surface.
 * Now only a superadmin (the same gate as the api-docs page) can read it.
 */
export async function GET() {
  const weddingId = await getWeddingId();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized || auth.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(spec);
}
