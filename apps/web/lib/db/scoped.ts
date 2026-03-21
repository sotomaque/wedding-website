/**
 * Wedding-Scoped Database Helpers
 *
 * Provides query builders that automatically filter by wedding_id,
 * preventing accidental cross-tenant data access.
 *
 * Usage:
 *   const weddingDb = forWedding(weddingId)
 *   const guests = await weddingDb.selectFrom("guests").selectAll().execute()
 *   // ↑ automatically includes .where("wedding_id", "=", weddingId)
 *
 * For complex queries (joins, subqueries), use `db` directly with manual
 * .where("table.wedding_id", "=", weddingId).
 */

import { type Expression, type InsertObject, type SqlBool, sql } from "kysely";
import { db } from "./index";
import type { Database } from "./types";

/** Tables that have a wedding_id column */
export type WeddingScopedTable =
  | "guests"
  | "activities"
  | "guest_activity_interests"
  | "photos"
  | "events"
  | "guest_event_invites"
  | "seating_charts"
  | "seating_tables"
  | "guest_table_assignments"
  | "parties"
  | "gifts"
  | "hotels"
  | "guest_hotel_interests"
  | "wedding_todos"
  | "guest_photos"
  | "documents"
  | "service_links";

// Helper: build the parameterized wedding_id filter expression
function weddingFilter(weddingId: string): Expression<SqlBool> {
  return sql`wedding_id = ${weddingId}`;
}

/**
 * Create a wedding-scoped database helper.
 *
 * All queries through this helper automatically filter by wedding_id.
 * Inserts automatically include wedding_id in the values.
 *
 * Note: The generic `T extends WeddingScopedTable` union causes Kysely's
 * .where() overloads to conflict at the type level. We use targeted type
 * assertions where needed — the runtime SQL is always correct.
 */
export function forWedding(weddingId: string) {
  const filter = weddingFilter(weddingId);

  return {
    /**
     * SELECT with automatic wedding_id filter.
     * Returns a Kysely SelectQueryBuilder — chain .select(), .where(), etc.
     */
    selectFrom(table: WeddingScopedTable) {
      return db.selectFrom(table).where(filter);
    },

    /**
     * INSERT with automatic wedding_id injection.
     * Returns a Kysely InsertQueryBuilder — chain .returning(), etc.
     */
    insertInto<T extends WeddingScopedTable>(
      table: T,
      values:
        | Omit<InsertObject<Database, T>, "wedding_id">
        | Omit<InsertObject<Database, T>, "wedding_id">[],
    ) {
      const withWeddingId = Array.isArray(values)
        ? values.map((v) => ({ ...v, wedding_id: weddingId }))
        : { ...values, wedding_id: weddingId };

      // biome-ignore lint/suspicious/noExplicitAny: Kysely generic constraint on InsertObject + Omit
      return db.insertInto(table).values(withWeddingId as any);
    },

    /**
     * UPDATE with automatic wedding_id filter.
     * Returns a Kysely UpdateQueryBuilder — chain .set(), .where(), etc.
     *
     * Note: The wedding_id filter is applied, but you still need to add
     * any additional .where() clauses (e.g., .where("id", "=", id)).
     */
    updateTable(table: WeddingScopedTable) {
      return db.updateTable(table).where(filter);
    },

    /**
     * DELETE with automatic wedding_id filter.
     * Returns a Kysely DeleteQueryBuilder — chain .where(), etc.
     *
     * Note: The wedding_id filter is applied, but you still need to add
     * any additional .where() clauses (e.g., .where("id", "=", id)).
     */
    deleteFrom(table: WeddingScopedTable) {
      return db.deleteFrom(table).where(filter);
    },

    /** The resolved wedding ID, for use in manual queries */
    weddingId,
  };
}
