import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";

/**
 * Update a table
 * @description Update a table's number, name, capacity, position, shape, or notes
 * @pathParams SeatingTableParams
 * @body UpdateTableBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> },
) {
  try {
    const { authorized, error } = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: error === "Unauthorized" ? 401 : 403 },
      );
    }

    const { tableId } = await params;
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

    const updateData: Record<string, unknown> = {};

    if (tableNumber !== undefined) updateData.tableNumber = tableNumber;
    if (tableName !== undefined) updateData.tableName = tableName;
    if (capacityOverride !== undefined)
      updateData.capacityOverride = capacityOverride;
    if (positionX !== undefined) updateData.positionX = positionX;
    if (positionY !== undefined) updateData.positionY = positionY;
    if (shape !== undefined) updateData.shape = shape;
    if (notes !== undefined) updateData.notes = notes;

    try {
      const table = await db.seatingTable.update({
        where: { id: tableId },
        data: updateData,
      });

      return NextResponse.json({ table });
    } catch {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }
  } catch (error) {
    console.error(
      "Error in PATCH /api/admin/seating-charts/[id]/tables/[tableId]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Delete a table
 * @description Permanently delete a table and its guest assignments from the seating chart
 * @pathParams SeatingTableParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> },
) {
  try {
    const { authorized, error } = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: error === "Unauthorized" ? 401 : 403 },
      );
    }

    const { tableId } = await params;

    await db.seatingTable.delete({
      where: { id: tableId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error in DELETE /api/admin/seating-charts/[id]/tables/[tableId]:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
