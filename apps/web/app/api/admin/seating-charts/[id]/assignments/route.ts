import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { isValidUUID } from "@/lib/utils/uuid";

/**
 * Bulk assign guests to tables
 * @description Assign multiple guests to tables in a single operation, replacing any existing assignments
 * @pathParams IdParams
 * @body BulkAssignmentsBody
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
    const { assignments } = body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: "Assignments array is required" },
        { status: 400 },
      );
    }

    // Verify the chart exists and get its tables
    const tables = await db.seatingTable.findMany({
      where: { seatingChartId: chartId, weddingId },
      select: { id: true },
    });

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

    // Only operate on guests that actually belong to this wedding, so foreign
    // guest ids can't be seated here — and can't have their existing assignment
    // in another wedding wiped by the deleteMany below.
    const requestedGuestIds = uniqueAssignments.map(
      (a: { guestId: string }) => a.guestId,
    );
    const ownedGuests = await db.guest.findMany({
      where: { id: { in: requestedGuestIds }, weddingId },
      select: { id: true },
    });
    const ownedGuestIds = new Set(ownedGuests.map((g) => g.id));
    const scopedAssignments = uniqueAssignments.filter(
      (a: { guestId: string }) => ownedGuestIds.has(a.guestId),
    );

    if (scopedAssignments.length === 0) {
      return NextResponse.json(
        { error: "No valid assignments for guests in this wedding" },
        { status: 400 },
      );
    }

    // Remove existing assignments for these guests (scoped to this wedding).
    const guestIds = scopedAssignments.map(
      (a: { guestId: string }) => a.guestId,
    );
    await db.guestTableAssignment.deleteMany({
      where: { guestId: { in: guestIds }, weddingId },
    });

    // Insert new assignments
    await db.guestTableAssignment.createMany({
      data: scopedAssignments.map(
        (a: { guestId: string; tableId: string; seatNumber?: number }) => ({
          guestId: a.guestId,
          seatingTableId: a.tableId,
          seatNumber: a.seatNumber || null,
          weddingId,
        }),
      ),
    });

    return NextResponse.json({
      success: true,
      assignedCount: scopedAssignments.length,
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
 * Clear guest assignments
 * @description Remove all guest-to-table assignments for a chart, or only specific guests via query params
 * @pathParams IdParams
 * @params ClearAssignmentsParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id: chartId } = await params;
    const { searchParams } = new URL(request.url);
    const guestIdsParam = searchParams.get("guestIds");

    // Get all tables for this chart
    const tables = await db.seatingTable.findMany({
      where: { seatingChartId: chartId, weddingId },
      select: { id: true },
    });

    const tableIds = tables.map((t) => t.id);

    if (tableIds.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    if (guestIdsParam) {
      // Delete specific guest assignments
      const guestIds = guestIdsParam.split(",");
      await db.guestTableAssignment.deleteMany({
        where: {
          seatingTableId: { in: tableIds },
          guestId: { in: guestIds },
          weddingId,
        },
      });
    } else {
      // Delete all assignments for this chart's tables
      await db.guestTableAssignment.deleteMany({
        where: { seatingTableId: { in: tableIds }, weddingId },
      });
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
