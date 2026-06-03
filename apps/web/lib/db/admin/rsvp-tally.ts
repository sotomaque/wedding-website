/**
 * Pure helpers for tallying RSVP statuses into total / confirmed / declined /
 * pending counts. Kept DB-free so the events dashboard can compute per-event
 * counts from a single guest query + a single grouped invite query (instead of
 * one query per event) and still be unit-testable.
 */

export interface RsvpTally {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
}

export function emptyTally(): RsvpTally {
  return { total: 0, confirmed: 0, declined: 0, pending: 0 };
}

/** Tally a flat list of RSVP statuses (null/unknown count toward pending). */
export function tallyRsvpStatuses(
  statuses: (string | null | undefined)[],
): RsvpTally {
  const tally = emptyTally();
  for (const status of statuses) {
    tally.total += 1;
    if (status === "yes") tally.confirmed += 1;
    else if (status === "no") tally.declined += 1;
    else tally.pending += 1;
  }
  return tally;
}

/**
 * Fold Prisma `groupBy({ by: ["eventId", "rsvpStatus"], _count })` rows into a
 * per-event tally map, so each event's counts come from one grouped query
 * rather than a query per event.
 */
export function tallyInviteGroups(
  groups: {
    eventId: string;
    rsvpStatus: string | null;
    _count: { _all: number };
  }[],
): Map<string, RsvpTally> {
  const byEvent = new Map<string, RsvpTally>();
  for (const group of groups) {
    const tally = byEvent.get(group.eventId) ?? emptyTally();
    const n = group._count._all;
    tally.total += n;
    if (group.rsvpStatus === "yes") tally.confirmed += n;
    else if (group.rsvpStatus === "no") tally.declined += n;
    else tally.pending += n;
    byEvent.set(group.eventId, tally);
  }
  return byEvent;
}
