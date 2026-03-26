import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
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
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id: chartId } = await params;
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

    // Verify the chart exists and belongs to this wedding
    const chart = await db.seatingChart.findFirst({
      where: { id: chartId, weddingId },
      select: { id: true },
    });

    if (!chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    // If no table number provided, get the next one
    let finalTableNumber = tableNumber;
    if (finalTableNumber === undefined) {
      const maxTable = await db.seatingTable.aggregate({
        where: { seatingChartId: chartId, weddingId },
        _max: { tableNumber: true },
      });

      finalTableNumber = (maxTable._max.tableNumber || 0) + 1;
    }

    const table = await db.seatingTable.create({
      data: {
        seatingChartId: chartId,
        tableNumber: finalTableNumber,
        tableName: tableName || null,
        capacityOverride: capacityOverride || null,
        positionX: positionX || 0,
        positionY: positionY || 0,
        shape: shape || "round",
        notes: notes || null,
        weddingId,
      },
    });

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
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id: chartId } = await params;

    await db.seatingTable.deleteMany({
      where: { seatingChartId: chartId, weddingId },
    });

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
