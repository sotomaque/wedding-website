import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";

/**
 * PATCH /api/admin/seating-charts/[id]/tables/[tableId]
 * Update a table
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

    if (tableNumber !== undefined) updateData.table_number = tableNumber;
    if (tableName !== undefined) updateData.table_name = tableName;
    if (capacityOverride !== undefined)
      updateData.capacity_override = capacityOverride;
    if (positionX !== undefined) updateData.position_x = positionX;
    if (positionY !== undefined) updateData.position_y = positionY;
    if (shape !== undefined) updateData.shape = shape;
    if (notes !== undefined) updateData.notes = notes;

    const table = await db
      .updateTable("seating_tables")
      .set(updateData)
      .where("id", "=", tableId)
      .returningAll()
      .executeTakeFirst();

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json({ table });
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
 * DELETE /api/admin/seating-charts/[id]/tables/[tableId]
 * Delete a table
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

    await db.deleteFrom("seating_tables").where("id", "=", tableId).execute();

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
