import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * Add table to seating chart
 * @description Create a new table in a seating chart with optional number, name, capacity, position, and shape
 * @pathParams IdParams
 * @body CreateTableBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, error } = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: error === "Unauthorized" ? 401 : 403 },
      );
    }

    const { id: chartId } = await params;
    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);
    const body = await request.json();
    const {
      tableNumber,
      tableName,
      capacityOverride,
      positionX,
      positionY,
      shape,
      notes,
    } = body;

    // Verify the chart exists
    const chart = await db
      .selectFrom("seating_charts")
      .where("wedding_id", "=", weddingId)
      .select("id")
      .where("id", "=", chartId)
      .executeTakeFirst();

    if (!chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    // If no table number provided, get the next one
    let finalTableNumber = tableNumber;
    if (finalTableNumber === undefined) {
      const lastTable = await db
        .selectFrom("seating_tables")
        .where("wedding_id", "=", weddingId)
        .select("table_number")
        .where("seating_chart_id", "=", chartId)
        .orderBy("table_number", "desc")
        .limit(1)
        .executeTakeFirst();

      finalTableNumber = (lastTable?.table_number || 0) + 1;
    }

    const table = await weddingDb
      .insertInto("seating_tables", {
        seating_chart_id: chartId,
        table_number: finalTableNumber,
        table_name: tableName || null,
        capacity_override: capacityOverride || null,
        position_x: positionX || 0,
        position_y: positionY || 0,
        shape: shape || "round",
        notes: notes || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return NextResponse.json({ table });
  } catch (error) {
    console.error(
      "Error in POST /api/admin/seating-charts/[id]/tables:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Delete all tables from chart
 * @description Bulk delete all tables from a seating chart
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, error } = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: error === "Unauthorized" ? 401 : 403 },
      );
    }

    const { id: chartId } = await params;
    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);

    await weddingDb
      .deleteFrom("seating_tables")
      .where("seating_chart_id", "=", chartId)
      .execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error in DELETE /api/admin/seating-charts/[id]/tables:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
