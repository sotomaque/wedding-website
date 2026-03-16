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

  // Strip sslmode from connection string — the pg library maps sslmode=require
  // to ssl:true which validates certs and fails on Supabase preview branches.
  // We handle SSL explicitly below instead.
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  const cleanConnectionString = url.toString();

  // Local Supabase (127.0.0.1 / localhost) does not support SSL.
  // Remote Supabase requires SSL but without strict cert validation.
  const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";

  return new Pool({
    connectionString: cleanConnectionString,
    max: 10,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
};

// Create the Kysely instance
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: createPool(),
  }),
});
