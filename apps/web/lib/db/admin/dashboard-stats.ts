/**
 * Dashboard RSVP statistics.
 *
 * The admin dashboard shows a live snapshot of where RSVPs stand — top-line
 * attending / declined / pending counts, an overall response rate, and
 * breakdowns by invite list, side, and event. This module gathers those in a
 * handful of `groupBy` queries and exposes pure folders so the aggregation
 * logic is unit-testable without a database.
 */

import { db } from "@/lib/db";
import { type RsvpStatusCounts, summarizeRsvpStatusGroups } from "./rsvp-stats";

export interface DimensionBreakdown {
  /** The grouping key (list value, side value, or event id). */
  key: string;
  /** Human-readable label for display. */
  label: string;
  total: number;
  attending: number;
  declined: number;
  pending: number;
}

export interface DashboardStats {
  totals: RsvpStatusCounts;
  /** Percentage of guests who have responded (yes or no), 0–100, rounded. */
  responseRate: number;
  byList: DimensionBreakdown[];
  bySide: DimensionBreakdown[];
  byEvent: DimensionBreakdown[];
}

/** responded / total as a 0–100 integer. 0 when there are no guests. */
export function computeResponseRate(counts: RsvpStatusCounts): number {
  if (counts.totalGuests === 0) return 0;
  const responded = counts.attending + counts.declined;
  return Math.round((responded / counts.totalGuests) * 100);
}

/**
 * Fold `groupBy` rows tagged with a dimension key + rsvpStatus into one
 * breakdown per requested dimension, preserving the order of `dimensions` so
 * empty buckets keep their place. Rows whose key isn't in `dimensions` (incl.
 * null keys) are ignored.
 */
export function foldDimension(
  rows: { key: string | null; rsvpStatus: string | null; _count: number }[],
  dimensions: { key: string; label: string }[],
): DimensionBreakdown[] {
  return dimensions.map(({ key, label }) => {
    const breakdown: DimensionBreakdown = {
      key,
      label,
      total: 0,
      attending: 0,
      declined: 0,
      pending: 0,
    };
    for (const row of rows) {
      if (row.key !== key) continue;
      const n = typeof row._count === "number" ? row._count : 0;
      breakdown.total += n;
      if (row.rsvpStatus === "yes") breakdown.attending += n;
      else if (row.rsvpStatus === "no") breakdown.declined += n;
      else breakdown.pending += n;
    }
    return breakdown;
  });
}

const LIST_DIMENSIONS = [
  { key: "a", label: "List A" },
  { key: "b", label: "List B" },
  { key: "c", label: "List C" },
];

const SIDE_DIMENSIONS = [
  { key: "bride", label: "Bride" },
  { key: "groom", label: "Groom" },
  { key: "both", label: "Both" },
];

/**
 * Live RSVP snapshot for the admin dashboard. Top-line counts reuse the shared
 * aggregator; the per-list / per-side breakdowns come from guest groupBys and
 * the per-event breakdown from the guest_event_invites table (its own rsvp
 * status). Empty buckets are dropped so only meaningful rows render.
 */
export async function getDashboardStats(
  weddingId: string,
): Promise<DashboardStats> {
  const [statusGroups, listGroups, sideGroups, eventGroups, events] =
    await Promise.all([
      db.guest.groupBy({
        by: ["rsvpStatus"],
        where: { weddingId },
        _count: true,
      }),
      db.guest.groupBy({
        by: ["list", "rsvpStatus"],
        where: { weddingId },
        _count: true,
      }),
      db.guest.groupBy({
        by: ["side", "rsvpStatus"],
        where: { weddingId },
        _count: true,
      }),
      db.guestEventInvite.groupBy({
        by: ["eventId", "rsvpStatus"],
        where: { weddingId },
        _count: true,
      }),
      db.event.findMany({
        where: { weddingId },
        select: { id: true, name: true },
        orderBy: { displayOrder: "asc" },
      }),
    ]);

  const totals = summarizeRsvpStatusGroups(statusGroups);

  const byList = foldDimension(
    listGroups.map((g) => ({
      key: g.list,
      rsvpStatus: g.rsvpStatus,
      _count: g._count,
    })),
    LIST_DIMENSIONS,
  ).filter((b) => b.total > 0);

  const bySide = foldDimension(
    sideGroups.map((g) => ({
      key: g.side,
      rsvpStatus: g.rsvpStatus,
      _count: g._count,
    })),
    SIDE_DIMENSIONS,
  ).filter((b) => b.total > 0);

  const byEvent = foldDimension(
    eventGroups.map((g) => ({
      key: g.eventId,
      rsvpStatus: g.rsvpStatus,
      _count: g._count,
    })),
    events.map((e) => ({ key: e.id, label: e.name })),
  ).filter((b) => b.total > 0);

  return {
    totals,
    responseRate: computeResponseRate(totals),
    byList,
    bySide,
    byEvent,
  };
}
