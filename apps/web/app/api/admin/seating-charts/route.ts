import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

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
    const { authorized, error } = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: error === "Unauthorized" ? 401 : 403 },
      );
    }

    const weddingId = await getWeddingId();

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
    const { authorized, error } = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: error === "Unauthorized" ? 401 : 403 },
      );
    }

    const body = await request.json();
    const { name, defaultSeatsPerTable, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Chart name is required" },
        { status: 400 },
      );
    }

    const weddingId = await getWeddingId();

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
