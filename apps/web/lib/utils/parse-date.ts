/**
 * Coerce a value coming from an admin form into something Prisma's `DateTime`
 * fields accept. `<input type="date">` submits "YYYY-MM-DD", which Prisma
 * rejects with "premature end of input. Expected ISO-8601 DateTime" — so a
 * date-only string is widened to midnight UTC. Existing `Date` values pass
 * through; blanks and unparseable input become null.
 */
export function parseDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T00:00:00.000Z`)
    : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
