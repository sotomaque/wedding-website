import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";

/**
 * Get seating chart details
 * @description Fetch a seating chart with all its tables, guest assignments, and unassigned guests
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function GET(
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

    const { id } = await params;

    // Fetch the chart with tables, assignments, and guest details
    const chart = await db.seatingChart.findUnique({
      where: { id },
    });

    if (!chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    // Fetch tables for this chart
    const tables = await db.seatingTable.findMany({
      where: { seatingChartId: id },
      orderBy: { tableNumber: "asc" },
    });

    // Fetch all assignments for these tables
    const tableIds = tables.map((t) => t.id);
    const assignments =
      tableIds.length > 0
        ? await db.guestTableAssignment.findMany({
            where: { seatingTableId: { in: tableIds } },
          })
        : [];

    // Fetch guest details for all assigned guests
    const assignedGuestIds = assignments.map((a) => a.guestId);
    const assignedGuests =
      assignedGuestIds.length > 0
        ? await db.guest.findMany({
            where: { id: { in: assignedGuestIds } },
          })
        : [];

    // Fetch all confirmed guests (for showing unassigned)
    const allConfirmedGuests = await db.guest.findMany({
      where: { rsvpStatus: "yes" },
    });

    // Build tables with guests
    const tablesWithGuests = tables.map((table) => {
      const tableAssignments = assignments.filter(
        (a) => a.seatingTableId === table.id,
      );
      const tableGuests = tableAssignments
        .map((a) => assignedGuests.find((g) => g.id === a.guestId))
        .filter(Boolean);

      return {
        ...table,
        guests: tableGuests,
        assignedCount: tableGuests.length,
        capacity: table.capacityOverride || chart.defaultSeatsPerTable,
      };
    });

    // Find unassigned guests
    const unassignedGuests = allConfirmedGuests.filter(
      (g) => !assignedGuestIds.includes(g.id),
    );

    // Calculate totals
    const totalCapacity = tablesWithGuests.reduce(
      (sum, t) => sum + t.capacity,
      0,
    );
    const totalAssigned = assignedGuestIds.length;

    return NextResponse.json({
      chart: {
        ...chart,
        tables: tablesWithGuests,
        totalAssigned,
        totalCapacity,
        unassignedGuests,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/seating-charts/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Update seating chart
 * @description Update a seating chart's name, default seats per table, active status, or notes
 * @pathParams IdParams
 * @body UpdateSeatingChartBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function PATCH(
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

    const { id } = await params;
    const body = await request.json();
    const { name, defaultSeatsPerTable, isActive, notes } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (defaultSeatsPerTable !== undefined)
      updateData.defaultSeatsPerTable = defaultSeatsPerTable;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notes !== undefined) updateData.notes = notes;

    try {
      const chart = await db.seatingChart.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ chart });
    } catch {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error in PATCH /api/admin/seating-charts/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Delete seating chart
 * @description Permanently delete a seating chart and all its associated tables and assignments
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

    const { id } = await params;

    await db.seatingChart.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/seating-charts/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
