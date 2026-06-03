import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { createSeatingChartSchema } from "@/lib/validations/admin-api";

/**
 * List seating charts
 * @description Fetch all seating charts ordered by last updated
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function GET() {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const charts = await db.seatingChart.findMany({
      where: { weddingId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ charts });
  } catch (error) {
    console.error("Error in GET /api/admin/seating-charts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Create seating chart
 * @description Create a new seating chart with a name, default seats per table, and optional notes
 * @body CreateSeatingChartBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json().catch(() => null);
    const parsed = createSeatingChartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Chart name is required" },
        { status: 400 },
      );
    }
    const { name, defaultSeatsPerTable, notes } = parsed.data;

    const chart = await db.seatingChart.create({
      data: {
        name,
        defaultSeatsPerTable: defaultSeatsPerTable || 8,
        isActive: false,
        notes: notes || null,
        weddingId,
      },
    });

    return NextResponse.json({ chart });
  } catch (error) {
    console.error("Error in POST /api/admin/seating-charts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
