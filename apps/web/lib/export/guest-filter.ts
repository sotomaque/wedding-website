/**
 * Build the Prisma `where` filter for a guest export from the wizard's scope
 * controls. Kept pure (no DB import) so it can be unit-tested directly.
 *
 * Mirrors the filter semantics of the guest table's `getGuests` action, plus a
 * "responded" RSVP shortcut (accepted OR declined, i.e. anyone who replied).
 */

import type { Prisma } from "@prisma/client";

export type RsvpScope = "all" | "yes" | "no" | "pending" | "responded";

export interface GuestExportFilters {
  rsvpStatus?: RsvpScope;
  side?: "bride" | "groom" | "both";
  list?: "a" | "b" | "c";
  family?: boolean;
  isPlusOne?: boolean;
  under21?: boolean;
  threeAndUnder?: boolean;
}

export function buildGuestExportWhere(
  weddingId: string,
  filters: GuestExportFilters = {},
): Prisma.GuestWhereInput {
  const where: Prisma.GuestWhereInput = { weddingId };

  switch (filters.rsvpStatus) {
    case "yes":
    case "no":
    case "pending":
      where.rsvpStatus = filters.rsvpStatus;
      break;
    case "responded":
      where.rsvpStatus = { in: ["yes", "no"] };
      break;
    default:
      // "all" / undefined → no RSVP constraint
      break;
  }

  if (filters.side) where.side = filters.side;
  if (filters.list) where.list = filters.list;
  if (filters.family !== undefined) where.family = filters.family;
  if (filters.isPlusOne !== undefined) where.isPlusOne = filters.isPlusOne;
  if (filters.under21 !== undefined) where.under21 = filters.under21;
  if (filters.threeAndUnder !== undefined)
    where.threeAndUnder = filters.threeAndUnder;

  return where;
}
