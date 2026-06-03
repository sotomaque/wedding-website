/**
 * Wedding-wide email communication log for the admin Communications page.
 *
 * Lists recent sends across the whole wedding (not just one guest), with the
 * linked guest's name when there is one, plus per-type counts. A pure
 * `summarizeEmailLogTypes` folder keeps the counting unit-testable.
 */

import { db } from "@/lib/db";

export interface EmailLogListEntry {
  id: string;
  type: string;
  subject: string | null;
  status: string;
  recipientEmail: string;
  createdAt: string;
  guest: { id: string; firstName: string; lastName: string | null } | null;
}

/** Fold log rows into a sorted [type, count] list for the summary chips. */
export function summarizeEmailLogTypes(
  rows: { type: string }[],
): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

export interface WeddingEmailLog {
  entries: EmailLogListEntry[];
  typeCounts: { type: string; count: number }[];
  total: number;
}

/**
 * Recent emails for a wedding, newest first, optionally filtered by type. Type
 * counts are computed over the whole wedding (independent of the active filter)
 * so the summary chips stay stable.
 */
export async function getWeddingEmailLog(
  weddingId: string,
  options: { type?: string; limit?: number } = {},
): Promise<WeddingEmailLog> {
  const limit = options.limit ?? 250;

  const [rows, allTypes, total] = await Promise.all([
    db.emailLog.findMany({
      where: {
        weddingId,
        ...(options.type ? { type: options.type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        subject: true,
        status: true,
        recipientEmail: true,
        createdAt: true,
        guest: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.emailLog.findMany({ where: { weddingId }, select: { type: true } }),
    db.emailLog.count({ where: { weddingId } }),
  ]);

  const entries: EmailLogListEntry[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    subject: r.subject,
    status: r.status,
    recipientEmail: r.recipientEmail,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
    guest: r.guest,
  }));

  return {
    entries,
    typeCounts: summarizeEmailLogTypes(allTypes),
    total,
  };
}
