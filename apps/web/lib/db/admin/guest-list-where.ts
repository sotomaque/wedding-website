/**
 * Build the Prisma `where` filter for the admin guest table from the URL search
 * params. Pure and typed (no `any`) so it can be unit-tested and so invalid
 * filter values can't silently reach the query.
 */

import type { Prisma } from "@prisma/client";

export interface GuestListFilterParams {
  side?: "bride" | "groom";
  /** Comma-separated RSVP statuses, e.g. "yes,no". */
  rsvpStatus?: string;
  list?: "a" | "b" | "c";
  family?: "true" | "false";
  isPlusOne?: "true" | "false";
  emailStatus?: "not_sent" | "sent" | "resent";
  under21?: "true" | "false";
  threeAndUnder?: "true" | "false";
  bridalParty?:
    | "groomsman"
    | "best_man"
    | "bridesmaid"
    | "maid_of_honor"
    | "any";
  /** Comma-separated event IDs; matches guests invited to ALL of them. */
  events?: string;
}

const RSVP_STATUSES = ["pending", "yes", "no"] as const;
type RsvpStatusValue = (typeof RSVP_STATUSES)[number];

function parseStatuses(raw: string): RsvpStatusValue[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is RsvpStatusValue =>
      (RSVP_STATUSES as readonly string[]).includes(s),
    );
}

export function buildGuestListWhere(
  weddingId: string,
  params: GuestListFilterParams = {},
): Prisma.GuestWhereInput {
  const where: Prisma.GuestWhereInput = { weddingId };

  if (params.side) where.side = params.side;

  if (params.rsvpStatus) {
    const statuses = parseStatuses(params.rsvpStatus);
    if (statuses.length === 1) where.rsvpStatus = statuses[0];
    else if (statuses.length > 1) where.rsvpStatus = { in: statuses };
  }

  if (params.list) where.list = params.list;
  if (params.family !== undefined) where.family = params.family === "true";
  if (params.isPlusOne !== undefined)
    where.isPlusOne = params.isPlusOne === "true";

  if (params.emailStatus === "not_sent") where.numberOfResends = 0;
  else if (params.emailStatus === "sent") where.numberOfResends = 1;
  else if (params.emailStatus === "resent") where.numberOfResends = { gt: 1 };

  if (params.under21 !== undefined) where.under21 = params.under21 === "true";
  if (params.threeAndUnder !== undefined)
    where.threeAndUnder = params.threeAndUnder === "true";

  if (params.bridalParty === "any") where.bridalPartyRole = { not: null };
  else if (params.bridalParty) where.bridalPartyRole = params.bridalParty;

  // Event invitation filter — guest must be invited to ALL selected events.
  if (params.events) {
    const eventIds = params.events.split(",").filter(Boolean);
    if (eventIds.length === 1) {
      where.guestEventInvites = { some: { eventId: eventIds[0] } };
    } else if (eventIds.length > 1) {
      where.AND = eventIds.map((id) => ({
        guestEventInvites: { some: { eventId: id } },
      }));
    }
  }

  return where;
}
