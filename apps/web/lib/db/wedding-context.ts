/**
 * Wedding Context Resolution
 *
 * Resolves the current wedding from request headers (set by middleware).
 * Fails closed when the tenant is unknown — never guesses a default wedding.
 */

import { headers } from "next/headers";
import { cache } from "react";
import { db } from "./index";
import { resolveWeddingContext } from "./wedding-resolver";

export interface WeddingContext {
  weddingId: string;
  slug: string;
  coupleName: string;
  weddingDate: Date;
  rsvpDeadline: string | null;
  timezone: string;
  status: string;
  person1Name: string | null;
  person2Name: string | null;
  featureToggles: Record<string, boolean>;
}

/**
 * Look up a wedding by slug. Cached per request via React.cache().
 */
const WEDDING_SELECT = {
  id: true,
  slug: true,
  coupleName: true,
  weddingDate: true,
  rsvpDeadline: true,
  timezone: true,
  status: true,
  person1Name: true,
  person2Name: true,
  featureToggles: true,
} as const;

function toContext(row: {
  id: string;
  slug: string;
  coupleName: string;
  weddingDate: Date;
  rsvpDeadline: string | null;
  timezone: string;
  status: string;
  person1Name: string | null;
  person2Name: string | null;
  featureToggles: unknown;
}): WeddingContext {
  return {
    weddingId: row.id,
    slug: row.slug,
    coupleName: row.coupleName,
    weddingDate: row.weddingDate,
    rsvpDeadline: row.rsvpDeadline,
    timezone: row.timezone,
    status: row.status,
    person1Name: row.person1Name,
    person2Name: row.person2Name,
    featureToggles: (row.featureToggles as Record<string, boolean>) ?? {},
  };
}

const getWeddingBySlug = cache(
  async (slug: string): Promise<WeddingContext | null> => {
    const row = await db.wedding.findUnique({
      where: { slug },
      select: WEDDING_SELECT,
    });

    if (!row) return null;
    return toContext(row);
  },
);

/**
 * Look up a wedding by ID. Cached per request via React.cache().
 */
const getWeddingById = cache(
  async (id: string): Promise<WeddingContext | null> => {
    const row = await db.wedding.findUnique({
      where: { id },
      select: WEDDING_SELECT,
    });

    if (!row) return null;
    return toContext(row);
  },
);

/**
 * Get the wedding context for the current request.
 *
 * Resolution order:
 * 1. x-wedding-id header (set by middleware)
 * 2. x-wedding-slug header (set by middleware)
 *
 * FAIL CLOSED: if neither header resolves to a real wedding, this throws
 * rather than guessing a tenant. It used to fall back to DEFAULT_WEDDING_SLUG
 * ("helen-and-enrique"), which in a multi-tenant deployment silently served
 * one couple's data to any request whose tenant couldn't be determined — e.g.
 * an /api/* call whose Referer was stripped would read/write the default
 * wedding instead of the intended one. Middleware is the single source of
 * tenant truth: it resolves the slug from the URL path (or, for /api/*, the
 * Referer), redirects bare legacy paths so they always carry a slug, and sets
 * the header here. A request that reaches this point with no header is one
 * whose tenant is genuinely unknown, and serving *any* wedding's data for it
 * is never correct.
 */
export const getWeddingContext = cache(async (): Promise<WeddingContext> => {
  const headerStore = await headers();
  return resolveWeddingContext({
    weddingId: headerStore.get("x-wedding-id"),
    weddingSlug: headerStore.get("x-wedding-slug"),
    getById: getWeddingById,
    getBySlug: getWeddingBySlug,
  });
});

/**
 * Convenience: get just the wedding ID for the current request.
 */
export async function getWeddingId(): Promise<string> {
  const ctx = await getWeddingContext();
  return ctx.weddingId;
}

export { getWeddingBySlug, getWeddingById };
