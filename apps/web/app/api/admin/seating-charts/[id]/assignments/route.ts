import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { isValidUUID } from "@/lib/utils/uuid";

/**
 * POST /api/admin/seating-charts/[id]/assignments
 * Assign guests to tables (bulk operation)
 * Body: { assignments: [{ guestId: string, tableId: string, seatNumber?: number }] }
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
    const body = await request.json();
    const { assignments } = body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: "Assignments array is required" },
        { status: 400 },
      );
    }

    // Verify the chart exists and get its tables
    const tables = await db
      .selectFrom("seating_tables")
      .select(["id"])
      .where("seating_chart_id", "=", chartId)
      .execute();

    const validTableIds = new Set(tables.map((t) => t.id));

    // Filter to valid assignments (table belongs to this chart AND guestId is valid UUID)
    const validAssignments = assignments.filter(
      (a: { tableId: string; guestId: string }) =>
        validTableIds.has(a.tableId) && isValidUUID(a.guestId),
    );

    if (validAssignments.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid assignments provided (check that guest IDs are valid UUIDs)",
        },
        { status: 400 },
      );
    }

    // Deduplicate by guestId - each guest can only be assigned to one table
    // If a guest appears multiple times, take the first assignment
    const seenGuestIds = new Set<string>();
    const uniqueAssignments = validAssignments.filter(
      (a: { guestId: string }) => {
        if (seenGuestIds.has(a.guestId)) {
          return false;
        }
        seenGuestIds.add(a.guestId);
        return true;
      },
    );

    // Remove existing assignments for these guests (they may be moving tables)
    const guestIds = uniqueAssignments.map(
      (a: { guestId: string }) => a.guestId,
    );

    // Only delete if we have valid UUIDs
    if (guestIds.length > 0) {
      await db
        .deleteFrom("guest_table_assignments")
        .where("guest_id", "in", guestIds)
        .execute();
    }

    // Insert new assignments
    const insertValues = uniqueAssignments.map(
      (a: { guestId: string; tableId: string; seatNumber?: number }) => ({
        guest_id: a.guestId,
        seating_table_id: a.tableId,
        seat_number: a.seatNumber || null,
      }),
    );

    await db
      .insertInto("guest_table_assignments")
      .values(insertValues)
      .execute();

    return NextResponse.json({
      success: true,
      assignedCount: uniqueAssignments.length,
    });
  } catch (error) {
    console.error(
      "Error in POST /api/admin/seating-charts/[id]/assignments:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/seating-charts/[id]/assignments
 * Clear all assignments for a chart, or specific guests
 * Query params: ?guestIds=id1,id2 (optional - if not provided, clears all)
 */
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const guestIdsParam = searchParams.get("guestIds");

    // Get all tables for this chart
    const tables = await db
      .selectFrom("seating_tables")
      .select(["id"])
      .where("seating_chart_id", "=", chartId)
      .execute();

    const tableIds = tables.map((t) => t.id);

    if (tableIds.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    if (guestIdsParam) {
      // Delete specific guest assignments
      const guestIds = guestIdsParam.split(",");
      await db
        .deleteFrom("guest_table_assignments")
        .where("seating_table_id", "in", tableIds)
        .where("guest_id", "in", guestIds)
        .execute();
    } else {
      // Delete all assignments for this chart's tables
      await db
        .deleteFrom("guest_table_assignments")
        .where("seating_table_id", "in", tableIds)
        .execute();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Error in DELETE /api/admin/seating-charts/[id]/assignments:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
