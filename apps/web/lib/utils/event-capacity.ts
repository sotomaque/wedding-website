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
