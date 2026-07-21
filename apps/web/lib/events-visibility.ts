/**
 * Keep only the events shown on the public wedding site.
 *
 * Private events (`isPublic === false`) — e.g. a bachelor party — are hidden
 * from guests on the public schedule, but still exist in the admin events list
 * and remain reachable via their direct/shareable RSVP link. Generic so it
 * works with any event-shaped object that carries an `isPublic` flag.
 */
export function selectPublicEvents<T extends { isPublic: boolean }>(
  events: T[],
): T[] {
  return events.filter((event) => event.isPublic);
}
