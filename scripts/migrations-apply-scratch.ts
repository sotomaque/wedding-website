#!/usr/bin/env bun
/**
 * Apply every supabase/migrations/*.sql to a scratch Postgres, in filename
 * order, failing fast on the first runtime SQL error.
 *
 * This is the deep gate for our hand-written SQL migrations: it catches the
 * class of bug that parses fine but fails at apply time (a column that doesn't
 * exist, a duplicate-key seed, an FK to a missing table, an incompatible ALTER)
 * — the kind that otherwise only surfaces as an opaque Supabase-branch failure.
 *
 * Runs a Supabase-compat shim first (scripts/supabase-compat-shim.sql) so
 * migrations that reference Supabase-managed roles / auth.role() apply against
 * a plain postgres image.
 *
 * Usage:  POSTGRES_URL=postgres://user:pass@host:5432/db  bun run migrations:apply-scratch
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const url = process.env.POSTGRES_URL;
if (!url) {
  console.error(
    "POSTGRES_URL is required (e.g. postgres://postgres:postgres@localhost:5432/postgres)",
  );
  process.exit(2);
}

const repoRoot = join(dirname(new URL(import.meta.url).pathname), "..");
const shim = join(repoRoot, "scripts", "supabase-compat-shim.sql");
const migrationsDir = join(repoRoot, "supabase", "migrations");

function psql(file: string): void {
  // ON_ERROR_STOP=1 turns the first SQL error into a non-zero exit; --no-psqlrc
  // keeps a developer's local ~/.psqlrc out of CI; -1 wraps the file in a single
  // transaction so a failed migration leaves no partial state behind.
  execFileSync(
    "psql",
    [
      url as string,
      "-v",
      "ON_ERROR_STOP=1",
      "--no-psqlrc",
      "-q",
      "-1",
      "-f",
      file,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
}

if (!existsSync(shim)) {
  console.error(`Missing compat shim: ${shim}`);
  process.exit(2);
}
console.log("Applying Supabase-compat shim…");
psql(shim);

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error(`No migrations found in ${migrationsDir}`);
  process.exit(2);
}

console.log(`Applying ${files.length} migrations in order…`);
for (const file of files) {
  try {
    psql(join(migrationsDir, file));
    console.log(`  ✓ ${file}`);
  } catch {
    // psql already streamed the SQL error to stderr; add the file for context.
    console.error(
      `\n❌ Migration failed to apply: supabase/migrations/${file}`,
    );
    console.error(
      "   Fix the migration (or extend scripts/supabase-compat-shim.sql if it " +
        "references a new Supabase-managed object), then re-run.",
    );
    process.exit(1);
  }
}

console.log(`\n✅ All ${files.length} migrations applied cleanly.`);
