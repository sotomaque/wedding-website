import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
import { getWeddingId } from "@/lib/db/wedding-context";

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
    const weddingId = await getWeddingId();

    // Fetch the chart
    const chart = await db
      .selectFrom("seating_charts")
      .where("wedding_id", "=", weddingId)
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    // Fetch tables for this chart
    const tables = await db
      .selectFrom("seating_tables")
      .where("wedding_id", "=", weddingId)
      .selectAll()
      .where("seating_chart_id", "=", id)
      .orderBy("table_number", "asc")
      .execute();

    // Fetch all assignments for these tables
    const tableIds = tables.map((t) => t.id);
    const assignments =
      tableIds.length > 0
        ? await db
            .selectFrom("guest_table_assignments")
            .where("wedding_id", "=", weddingId)
            .selectAll()
            .where("seating_table_id", "in", tableIds)
            .execute()
        : [];

    // Fetch guest details for all assigned guests
    const assignedGuestIds = assignments.map((a) => a.guest_id);
    const assignedGuests =
      assignedGuestIds.length > 0
        ? await db
            .selectFrom("guests")
            .where("wedding_id", "=", weddingId)
            .selectAll()
            .where("id", "in", assignedGuestIds)
            .execute()
        : [];

    // Fetch all confirmed guests (for showing unassigned)
    const allConfirmedGuests = await db
      .selectFrom("guests")
      .where("wedding_id", "=", weddingId)
      .selectAll()
      .where("rsvp_status", "=", "yes")
      .execute();

    // Build tables with guests
    const tablesWithGuests = tables.map((table) => {
      const tableAssignments = assignments.filter(
        (a) => a.seating_table_id === table.id,
      );
      const tableGuests = tableAssignments
        .map((a) => assignedGuests.find((g) => g.id === a.guest_id))
        .filter(Boolean);

      return {
        ...table,
        guests: tableGuests,
        assignedCount: tableGuests.length,
        capacity: table.capacity_override || chart.default_seats_per_table,
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
    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);
    const body = await request.json();
    const { name, defaultSeatsPerTable, isActive, notes } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (defaultSeatsPerTable !== undefined)
      updateData.default_seats_per_table = defaultSeatsPerTable;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (notes !== undefined) updateData.notes = notes;

    const chart = await weddingDb
      .updateTable("seating_charts")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    return NextResponse.json({ chart });
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
    const weddingId = await getWeddingId();
    const weddingDb = forWedding(weddingId);

    await weddingDb.deleteFrom("seating_charts").where("id", "=", id).execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/seating-charts/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
