/**
 * Headcount criteria — translate an admin's `HeadcountConfig` into a Prisma
 * `where` filter for counting guests, plus a short human-readable summary for
 * the dashboard card subtitle.
 *
 * The headcount stat always counts accepted guests (`rsvpStatus === "yes"`);
 * the config only narrows *which* accepted guests count (by list, by age
 * flags). Kept dependency-light and pure so it can be unit-tested without a DB.
 */

import type { Prisma } from "@prisma/client";
import {
  guestListValues,
  type HeadcountConfig,
} from "@/lib/validations/wedding-content";

/**
 * Build the Prisma `where` filter that selects the guests counted toward the
 * dashboard headcount for a given wedding + config.
 *
 * - Always scopes to the wedding and to accepted RSVPs.
 * - Only constrains by list when the admin has narrowed the selection — the
 *   all-lists default needs no filter, which keeps the query lean and means an
 *   empty config (`{}`) reproduces the original "every accepted guest" count.
 * - An empty `includedLists` intentionally yields zero (matches `list IN ()`).
 */
export function buildHeadcountWhere(
  weddingId: string,
  config: HeadcountConfig,
): Prisma.GuestWhereInput {
  const where: Prisma.GuestWhereInput = {
    weddingId,
    rsvpStatus: "yes",
  };

  if (config.includedLists.length < guestListValues.length) {
    where.list = { in: config.includedLists };
  }

  if (config.excludeThreeAndUnder) {
    where.threeAndUnder = false;
  }

  if (config.excludeUnder21) {
    where.under21 = false;
  }

  return where;
}

/**
 * Short summary of the active criteria for the dashboard card subtitle, e.g.
 * "A/B-list · excl. 3 & under". Falls back to "accepted" when no narrowing is
 * applied so the default card reads naturally.
 */
export function describeHeadcount(config: HeadcountConfig): string {
  const parts: string[] = [];

  if (config.includedLists.length < guestListValues.length) {
    parts.push(
      config.includedLists.length === 0
        ? "no lists"
        : `${config.includedLists.map((l) => l.toUpperCase()).join("/")}-list`,
    );
  }
  if (config.excludeThreeAndUnder) parts.push("excl. 3 & under");
  if (config.excludeUnder21) parts.push("excl. under 21");

  return parts.length > 0 ? parts.join(" · ") : "accepted";
}
