/**
 * Resolve the recipient audience for the two-week reminder email.
 *
 * The audience is the set of *confirmed* guests (with a usable email address)
 * for a chosen scope: either every confirmed guest for the wedding, or the
 * guests confirmed for one specific event. Per-event confirmation mirrors the
 * event dashboard (see event-rsvp-breakdown.ts): a "default" event — one that
 * everyone is invited to — uses each guest's main RSVP status, while a targeted
 * event uses the per-event GuestEventInvite status.
 *
 * Kept in one place so the route's audience listing (the manual picker) and the
 * actual send resolve exactly the same set.
 */

import { db } from "@/lib/db";

export interface ReminderAudienceGuest {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
}

export type ReminderScope =
  | { type: "all" }
  | { type: "event"; eventId: string };

const GUEST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

/** Narrowing predicate: keeps only guests with a usable ("@"-bearing) email. */
function withUsableEmail<T extends { email: string | null }>(
  guest: T,
): guest is T & { email: string } {
  // Require a single "@"-bearing address with no whitespace/comma/semicolon —
  // a stored value like "a@b.com, evil@x.com" (guest email is only loosely
  // validated on create) must not become a multi-recipient `to`.
  return (
    typeof guest.email === "string" &&
    guest.email.includes("@") &&
    !/[\s,;]/.test(guest.email)
  );
}

async function fetchAllConfirmed(
  weddingId: string,
): Promise<ReminderAudienceGuest[]> {
  const guests = await db.guest.findMany({
    where: { weddingId, rsvpStatus: "yes", email: { not: null } },
    select: GUEST_SELECT,
    orderBy: { firstName: "asc" },
  });
  return guests.filter(withUsableEmail);
}

/**
 * Resolve the confirmed-with-email audience for a scope.
 *
 * Returns `null` only when `scope` names an event that does not belong to this
 * wedding (so the caller can respond 404); an existing event with no confirmed
 * guests resolves to an empty array.
 */
export async function resolveReminderAudience(
  weddingId: string,
  scope: ReminderScope,
): Promise<ReminderAudienceGuest[] | null> {
  if (scope.type === "all") {
    return fetchAllConfirmed(weddingId);
  }

  const event = await db.event.findFirst({
    where: { id: scope.eventId, weddingId },
    select: { isDefault: true },
  });
  if (!event) return null;

  // Default events invite everyone — fall back to the main-RSVP audience.
  if (event.isDefault) return fetchAllConfirmed(weddingId);

  const invites = await db.guestEventInvite.findMany({
    where: {
      eventId: scope.eventId,
      weddingId,
      rsvpStatus: "yes",
      guest: { email: { not: null } },
    },
    select: { guest: { select: GUEST_SELECT } },
    orderBy: { guest: { firstName: "asc" } },
  });
  return invites.map((invite) => invite.guest).filter(withUsableEmail);
}
