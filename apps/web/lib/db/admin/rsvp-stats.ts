/**
 * Shared RSVP status aggregation.
 *
 * The admin dashboard's AI features (rsvp-insights generation and the AI chat
 * stats snapshot) both need the same total / attending / declined / pending
 * counts for a wedding. This computes them in a single `groupBy` and exposes a
 * pure summarizer so the folding logic is unit-testable without a DB.
 */

import { db } from "@/lib/db";

export interface RsvpStatusCounts {
  /** Every guest for the wedding (sum across all statuses). */
  totalGuests: number;
  /** rsvpStatus === "yes" */
  attending: number;
  /** rsvpStatus === "no" */
  declined: number;
  /** rsvpStatus === "pending" (or unset) */
  pending: number;
}

/**
 * Fold Prisma `groupBy({ by: ["rsvpStatus"], _count })` rows into counts.
 * Anything that isn't an explicit yes/no counts toward pending.
 */
export function summarizeRsvpStatusGroups(
  groups: { rsvpStatus: string | null; _count: number }[],
): RsvpStatusCounts {
  const counts: RsvpStatusCounts = {
    totalGuests: 0,
    attending: 0,
    declined: 0,
    pending: 0,
  };
  for (const group of groups) {
    const n = typeof group._count === "number" ? group._count : 0;
    counts.totalGuests += n;
    if (group.rsvpStatus === "yes") counts.attending += n;
    else if (group.rsvpStatus === "no") counts.declined += n;
    else counts.pending += n;
  }
  return counts;
}

/** Total / attending / declined / pending guest counts for a wedding. */
export async function getRsvpStats(
  weddingId: string,
): Promise<RsvpStatusCounts> {
  const groups = await db.guest.groupBy({
    by: ["rsvpStatus"],
    where: { weddingId },
    _count: true,
  });
  return summarizeRsvpStatusGroups(groups);
}
