import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/client";
import {
  buildUserPrompt,
  insightsOutputSchema,
  type RsvpStats,
  systemPrompt,
} from "@/lib/ai/prompts/rsvp-insights";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getRsvpStats } from "@/lib/db/admin/rsvp-stats";
import { getWeddingContext } from "@/lib/db/wedding-context";

export async function POST() {
  try {
    const ctx = await getWeddingContext();
    const auth = await requireAdmin(ctx.weddingId);
    if ("status" in auth) return auth;

    // Gather stats in parallel. Top-line RSVP counts come from the shared
    // aggregator (one groupBy); the per-list / per-side breakdowns and dietary
    // notes are insights-specific.
    const [rsvp, listGroups, sideGroups, dietaryGuests, invitedCount] =
      await Promise.all([
        getRsvpStats(ctx.weddingId),
        db.guest.groupBy({
          by: ["list", "rsvpStatus"],
          where: { weddingId: ctx.weddingId },
          _count: true,
        }),
        db.guest.groupBy({
          by: ["side", "rsvpStatus"],
          where: { weddingId: ctx.weddingId },
          _count: true,
        }),
        db.guest.findMany({
          where: {
            weddingId: ctx.weddingId,
            rsvpStatus: "yes",
            dietaryRestrictions: { not: null },
          },
          select: { dietaryRestrictions: true },
        }),
        db.guest.count({
          where: { weddingId: ctx.weddingId, numberOfResends: { gt: 0 } },
        }),
      ]);

    const { attending, declined, pending, totalGuests: totalCount } = rsvp;

    const now = new Date();
    const daysUntilWedding = Math.ceil(
      (ctx.weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let daysUntilDeadline: number | null = null;
    if (ctx.rsvpDeadline) {
      const deadline = new Date(ctx.rsvpDeadline);
      if (!Number.isNaN(deadline.getTime())) {
        daysUntilDeadline = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
    }

    // Build by-list stats
    const byList: RsvpStats["byList"] = {};
    for (const list of ["a", "b", "c"]) {
      const rows = listGroups.filter((g) => g.list === list);
      byList[list] = {
        total: rows.reduce((s, g) => s + g._count, 0),
        attending: rows.find((g) => g.rsvpStatus === "yes")?._count ?? 0,
        pending: rows.find((g) => g.rsvpStatus === "pending")?._count ?? 0,
      };
    }

    // Build by-side stats
    const bySide: RsvpStats["bySide"] = {};
    for (const side of ["bride", "groom", "both"]) {
      const rows = sideGroups.filter((g) => g.side === side);
      bySide[side] = {
        total: rows.reduce((s, g) => s + g._count, 0),
        attending: rows.find((g) => g.rsvpStatus === "yes")?._count ?? 0,
      };
    }

    const stats: RsvpStats = {
      totalGuests: totalCount,
      attending,
      declined,
      pending,
      invited: invitedCount,
      uninvited: totalCount - invitedCount,
      byList,
      bySide,
      dietaryRestrictions: dietaryGuests
        .map((g) => g.dietaryRestrictions)
        .filter((r): r is string => r !== null),
      daysUntilWedding,
      daysUntilDeadline,
    };

    const result = await generateStructured(insightsOutputSchema, {
      context: {
        weddingId: ctx.weddingId,
        weddingContext: ctx,
        feature: "rsvp-insights",
      },
      system: systemPrompt(ctx),
      prompt: buildUserPrompt(stats),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      insights: result.data.insights,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/ai/rsvp-insights/generate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
