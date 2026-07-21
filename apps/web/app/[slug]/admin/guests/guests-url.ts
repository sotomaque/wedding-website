/**
 * Build an `/[slug]/admin/guests` URL that PRESERVES the entire current query
 * string (every filter, sort, and pagination param) and only applies the
 * `changes` you pass — set a key to a string to upsert it, or to `null` to
 * remove it.
 *
 * Why read `window.location.search` instead of a `useSearchParams()` snapshot?
 * Some of these navigations fire from callbacks that get baked into the
 * memoized TanStack `columns` in `guests-table.tsx` (e.g. row "Edit" and column
 * sort). A captured `searchParams` snapshot goes STALE the moment a filter
 * changes without rebuilding that memo, which silently dropped active filters
 * (e.g. "physical invite sent") when you opened a guest to edit. Reading the
 * live URL at call time sidesteps the stale closure AND means any filter added
 * to the UI in the future is carried along automatically — there is no per-key
 * allowlist here to keep in sync.
 *
 * IMPORTANT: call this from a client event handler (where `window` exists), not
 * during render/SSR. On the server it falls back to an empty query string.
 */
export function buildGuestsUrl(
  slug: string,
  changes: Record<string, string | null> = {},
): string {
  const search = typeof window === "undefined" ? "" : window.location.search;
  const params = new URLSearchParams(search);

  for (const [key, value] of Object.entries(changes)) {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const qs = params.toString();
  return `/${slug}/admin/guests${qs ? `?${qs}` : ""}`;
}
