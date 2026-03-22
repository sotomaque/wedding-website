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

/**
 * Create a wedding-scoped database helper.
 *
 * All queries through this helper automatically filter by wedding_id.
 * Inserts automatically include wedding_id in the values.
 */
export function forWedding(weddingId: string) {
  const filter: Expression<SqlBool> = sql`wedding_id = ${weddingId}`;

  return {
    /**
     * SELECT with automatic wedding_id filter.
     * Pass a specific table name literal for proper type inference on .selectAll().
     */
    selectFrom(table: WeddingScopedTable) {
      return db.selectFrom(table).where(filter);
    },

    /**
     * INSERT with automatic wedding_id injection.
     * Values are passed as second arg; wedding_id is auto-added.
     */
    insertInto<T extends WeddingScopedTable & keyof Database>(
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
     * You still need to add .where("id", "=", id) etc.
     */
    updateTable(table: WeddingScopedTable) {
      return db.updateTable(table).where(filter);
    },

    /**
     * DELETE with automatic wedding_id filter.
     * You still need to add .where("id", "=", id) etc.
     */
    deleteFrom(table: WeddingScopedTable) {
      return db.deleteFrom(table).where(filter);
    },

    /** The resolved wedding ID, for use in manual queries */
    weddingId,
  };
}
