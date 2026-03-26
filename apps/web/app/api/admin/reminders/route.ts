import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * GET /api/admin/reminders
 * List all RSVP reminder schedules for the current wedding.
 */
export async function GET() {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const schedules = await db.reminderSchedule.findMany({
      where: { weddingId },
      orderBy: { daysBeforeDeadline: "desc" },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error in GET /api/admin/reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/reminders
 * Create a new reminder schedule.
 * @body { daysBeforeDeadline: number, isEnabled?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { daysBeforeDeadline, isEnabled } = body;

    if (
      typeof daysBeforeDeadline !== "number" ||
      daysBeforeDeadline < 1 ||
      !Number.isInteger(daysBeforeDeadline)
    ) {
      return NextResponse.json(
        { error: "daysBeforeDeadline must be a positive integer" },
        { status: 400 },
      );
    }

    const schedule = await db.reminderSchedule.create({
      data: {
        weddingId,
        daysBeforeDeadline,
        isEnabled: isEnabled ?? true,
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A reminder with this number of days already exists" },
        { status: 409 },
      );
    }

    console.error("Error in POST /api/admin/reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/reminders
 * Bulk update reminder schedules.
 * @body { schedules: Array<{ id: string, isEnabled?: boolean, daysBeforeDeadline?: number }> }
 */
export async function PUT(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { schedules } = body;

    if (!Array.isArray(schedules)) {
      return NextResponse.json(
        { error: "schedules must be an array" },
        { status: 400 },
      );
    }

    const updated = [];
    for (const s of schedules) {
      if (!s.id) continue;

      const data: Record<string, unknown> = {};
      if (typeof s.isEnabled === "boolean") data.isEnabled = s.isEnabled;
      if (
        typeof s.daysBeforeDeadline === "number" &&
        s.daysBeforeDeadline >= 1
      ) {
        data.daysBeforeDeadline = s.daysBeforeDeadline;
      }

      if (Object.keys(data).length === 0) continue;

      const result = await db.reminderSchedule.update({
        where: { id: s.id, weddingId },
        data,
      });
      updated.push(result);
    }

    return NextResponse.json({ schedules: updated });
  } catch (error) {
    console.error("Error in PUT /api/admin/reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/reminders
 * Delete a reminder schedule.
 * @body { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await db.reminderSchedule.delete({
      where: { id, weddingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
