import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * GET /api/admin/admin-summary-config
 * Get the admin summary email configuration for the current wedding.
 */
export async function GET() {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const config = await db.adminSummaryConfig.findUnique({
      where: { weddingId },
    });

    return NextResponse.json({
      config: config ?? { isEnabled: false, frequencyDays: 7 },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/admin-summary-config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/admin-summary-config
 * Create or update the admin summary email configuration.
 * @body { isEnabled: boolean, frequencyDays?: number }
 */
export async function PUT(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { isEnabled, frequencyDays } = body;

    if (typeof isEnabled !== "boolean") {
      return NextResponse.json(
        { error: "isEnabled must be a boolean" },
        { status: 400 },
      );
    }

    if (
      frequencyDays !== undefined &&
      (typeof frequencyDays !== "number" ||
        frequencyDays < 1 ||
        !Number.isInteger(frequencyDays))
    ) {
      return NextResponse.json(
        { error: "frequencyDays must be a positive integer" },
        { status: 400 },
      );
    }

    const config = await db.adminSummaryConfig.upsert({
      where: { weddingId },
      create: {
        weddingId,
        isEnabled,
        frequencyDays: frequencyDays ?? 7,
      },
      update: {
        isEnabled,
        ...(frequencyDays !== undefined ? { frequencyDays } : {}),
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error in PUT /api/admin/admin-summary-config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
