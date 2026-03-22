/**
 * Wedding Context Resolution
 *
 * Resolves the current wedding from request headers (set by middleware)
 * or falls back to DEFAULT_WEDDING_SLUG for backward compatibility.
 */

import { headers } from "next/headers";
import { cache } from "react";
import { db } from "./index";

export interface WeddingContext {
  weddingId: string;
  slug: string;
  coupleName: string;
  weddingDate: Date;
  rsvpDeadline: string | null;
  timezone: string;
  status: string;
}

/**
 * Look up a wedding by slug. Cached per request via React.cache().
 */
const getWeddingBySlug = cache(
  async (slug: string): Promise<WeddingContext | null> => {
    const row = await db.wedding.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        coupleName: true,
        weddingDate: true,
        rsvpDeadline: true,
        timezone: true,
        status: true,
      },
    });

    if (!row) return null;

    return {
      weddingId: row.id,
      slug: row.slug,
      coupleName: row.coupleName,
      weddingDate: row.weddingDate,
      rsvpDeadline: row.rsvpDeadline,
      timezone: row.timezone,
      status: row.status,
    };
  },
);

/**
 * Look up a wedding by ID. Cached per request via React.cache().
 */
const getWeddingById = cache(
  async (id: string): Promise<WeddingContext | null> => {
    const row = await db.wedding.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        coupleName: true,
        weddingDate: true,
        rsvpDeadline: true,
        timezone: true,
        status: true,
      },
    });

    if (!row) return null;

    return {
      weddingId: row.id,
      slug: row.slug,
      coupleName: row.coupleName,
      weddingDate: row.weddingDate,
      rsvpDeadline: row.rsvpDeadline,
      timezone: row.timezone,
      status: row.status,
    };
  },
);

/**
 * Get the wedding context for the current request.
 *
 * Resolution order:
 * 1. x-wedding-id header (set by middleware)
 * 2. x-wedding-slug header (set by middleware)
 * 3. DEFAULT_WEDDING_SLUG env var (backward compat for single-tenant mode)
 *
 * Throws if no wedding context can be resolved.
 */
export const getWeddingContext = cache(async (): Promise<WeddingContext> => {
  const headerStore = await headers();
  const weddingId = headerStore.get("x-wedding-id");
  const weddingSlug = headerStore.get("x-wedding-slug");

  // Try by ID first (most efficient, set by middleware)
  if (weddingId) {
    const ctx = await getWeddingById(weddingId);
    if (ctx) return ctx;
  }

  // Try by slug from header
  if (weddingSlug) {
    const ctx = await getWeddingBySlug(weddingSlug);
    if (ctx) return ctx;
  }

  // Fall back to DEFAULT_WEDDING_SLUG for backward compat
  const defaultSlug = process.env.DEFAULT_WEDDING_SLUG;
  if (defaultSlug) {
    const ctx = await getWeddingBySlug(defaultSlug);
    if (ctx) return ctx;
  }

  throw new Error(
    "Could not resolve wedding context. Ensure middleware is setting x-wedding-id/x-wedding-slug headers, or set DEFAULT_WEDDING_SLUG env var.",
  );
});

/**
 * Convenience: get just the wedding ID for the current request.
 */
export async function getWeddingId(): Promise<string> {
  const ctx = await getWeddingContext();
  return ctx.weddingId;
}

export { getWeddingBySlug, getWeddingById };
