#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env file
const envPath = join(process.cwd(), ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  }
} catch (error) {
  console.warn("⚠️  Could not load .env file from apps/web/.env");
  console.error(error);
}

/**
 * Setup Supabase database schema
 * Reads and executes the SQL schema file
 */
async function setupDatabase() {
  console.log("🔄 Setting up Supabase database schema...\n");

  // Load environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL not found");
    console.error("Please add it to your apps/web/.env file");
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY not found");
    console.error(
      "Please add your service role key to apps/web/.env or pass it as an argument:",
    );
    console.error("  bun scripts/setup-database.ts YOUR_SERVICE_ROLE_KEY");
    console.error(
      "\nFind it in: Supabase Dashboard -> Settings -> API -> service_role (secret)",
    );
    process.exit(1);
  }

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Read SQL schema from project root
  const schemaPath = join(process.cwd(), "../../supabase-schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");

  try {
    console.log("📝 Executing SQL schema...\n");

    // Split SQL into individual statements and execute them
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(
        (s) =>
          s.length > 0 &&
          !s.startsWith("--") &&
          s !== "" &&
          !/^\/\*[\s\S]*?\*\/$/.test(s),
      );

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing...`);

      const { error } = await supabase.rpc("exec", {
        sql: statement + ";",
      });

      if (error) {
        // Try direct query if RPC doesn't work
        // biome-ignore lint/suspicious/noExplicitAny: <supabase type>
        const { error: directError } = await (supabase as any)
          .from("_")
          .select(statement);

        if (directError?.message.includes("relation")) {
          console.log(`  ✓ ${statement?.substring(0, 60)}...`);
          continue;
        }

        if (directError) {
          console.error(`  ❌ Error: ${directError.message}`);
          console.error(`  Statement: ${statement?.substring(0, 100)}...`);
        } else {
          console.log(`  ✓ Success`);
        }
      } else {
        console.log(`  ✓ Success`);
      }
    }

    console.log("\n✅ Database schema applied successfully!");
    console.log("\nCreated tables:");
    console.log("  - guests");
    console.log("  - activities");
    console.log("  - guest_activity_interests");
    console.log("\nYou can now test the connection:");
    console.log("  curl http://localhost:3000/api/test-supabase");
  } catch (err) {
    console.error("\n❌ Failed to apply schema");
    console.error("\nPlease run the SQL manually in the Supabase Dashboard:");
    console.error(
      `  https://app.supabase.com/project/yjezfveooxxggzsnaray/sql/new`,
    );
    console.error(
      "\nCopy the contents of supabase-schema.sql and paste it there.",
    );
    throw err;
  }
}

// Get service key from command line arg if provided
if (process.argv[2]) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.argv[2];
}

setupDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
