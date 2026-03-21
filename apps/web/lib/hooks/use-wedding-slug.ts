"use client";

import { useParams } from "next/navigation";

/**
 * Get the wedding slug from the current URL params.
 * Only works in client components rendered under app/[slug]/.
 */
export function useWeddingSlug(): string {
  const params = useParams<{ slug: string }>();
  return params.slug;
}
