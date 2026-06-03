/**
 * Pure helpers for per-event capacity.
 *
 * An event's `capacity` is an optional cap on confirmed ("yes") attendees.
 * Null/undefined means unlimited. These are extracted so the public RSVP flow's
 * gating logic is unit-testable without a database.
 */

/** Whether a new attending RSVP should be blocked given the current count. */
export function isEventFull(
  confirmedCount: number,
  capacity: number | null | undefined,
): boolean {
  if (capacity == null) return false;
  return confirmedCount >= capacity;
}

/** Remaining seats, or null when capacity is unlimited. Never negative. */
export function remainingCapacity(
  confirmedCount: number,
  capacity: number | null | undefined,
): number | null {
  if (capacity == null) return null;
  return Math.max(0, capacity - confirmedCount);
}

/**
 * Whether `requested` additional attendees fit alongside `confirmedOthers`
 * already-confirmed guests. Used by the public RSVP flow when a party (a primary
 * guest plus household members) confirms together — every head must fit.
 */
export function canAccommodate(
  confirmedOthers: number,
  requested: number,
  capacity: number | null | undefined,
): boolean {
  if (capacity == null) return true;
  return confirmedOthers + requested <= capacity;
}
