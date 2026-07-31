/**
 * Tenant-selection policy, split out from wedding-context.ts so it can be unit
 * tested in isolation (that module is globally mocked across the test suite,
 * so its real behavior is otherwise unreachable in-suite).
 *
 * The policy is deliberately FAIL CLOSED: it resolves a wedding only from the
 * middleware-provided id/slug and throws when neither resolves. It never guesses
 * a default tenant — serving one couple's data to a request whose tenant can't
 * be determined is never correct in a multi-tenant deployment.
 */
export async function resolveWeddingContext<T>(opts: {
  weddingId: string | null;
  weddingSlug: string | null;
  getById: (id: string) => Promise<T | null>;
  getBySlug: (slug: string) => Promise<T | null>;
}): Promise<T> {
  const { weddingId, weddingSlug, getById, getBySlug } = opts;

  // Try by ID first (most efficient, set by middleware).
  if (weddingId) {
    const ctx = await getById(weddingId);
    if (ctx) return ctx;
  }

  // Then by slug from the header.
  if (weddingSlug) {
    const ctx = await getBySlug(weddingSlug);
    if (ctx) return ctx;
  }

  throw new Error(
    "Could not resolve wedding context: no x-wedding-id/x-wedding-slug header " +
      "was set by middleware for this request (tenant unknown). Refusing to " +
      "fall back to a default wedding.",
  );
}
