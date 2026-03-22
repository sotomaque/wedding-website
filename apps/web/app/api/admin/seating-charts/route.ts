import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
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

    const charts = await db
      .selectFrom("seating_charts")
      .where("wedding_id", "=", weddingId)
      .selectAll()
      .orderBy("updated_at", "desc")
      .execute();

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
    const weddingDb = forWedding(weddingId);

    const chart = await weddingDb
      .insertInto("seating_charts", {
        name,
        default_seats_per_table: defaultSeatsPerTable || 8,
        is_active: false,
        notes: notes || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return NextResponse.json({ chart });
  } catch (error) {
    console.error("Error in POST /api/admin/seating-charts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
