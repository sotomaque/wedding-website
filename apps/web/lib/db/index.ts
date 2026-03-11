/**
 * Kysely Database Client
 * Connects to Supabase PostgreSQL database using Kysely for type-safe queries
 */

import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { env } from "@/env";
import type { Database } from "./types";

// Create a PostgreSQL connection pool
const createPool = () => {
  // Supabase connection string format:
  // postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

  // Supabase Vercel integration sets POSTGRES_URL; fallback to DATABASE_URL for local dev
  const connectionString = env.POSTGRES_URL ?? env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Get your connection string from Supabase Dashboard:\n" +
        "1. Go to https://supabase.com/dashboard/project/[your-project]/settings/database\n" +
        "2. Under 'Connection string' > 'URI', copy the connection pooling string\n" +
        "3. Set it as DATABASE_URL in your .env file",
    );
  }

  return new Pool({
    connectionString,
    max: 10,
    ssl: { rejectUnauthorized: false },
  });
};

// Create the Kysely instance
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: createPool(),
  }),
});
