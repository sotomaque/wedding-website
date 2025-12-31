#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";

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
 * Setup Supabase database schema using the SQL Editor API
 */
async function setupDatabase() {
  console.log("🔄 Setting up Supabase database schema...\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL not found");
    console.error("Please add it to your apps/web/.env file");
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY not found");
    console.error("Please add it to your apps/web/.env file");
    process.exit(1);
  }

  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
  if (!projectRef) {
    console.error("❌ Error: Could not extract project ref from URL");
    process.exit(1);
  }

  console.log(`📦 Project: ${projectRef}\n`);

  // Read SQL schema
  const schemaPath = join(process.cwd(), "../../supabase-schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");

  try {
    // Use the Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    console.log("✅ Database schema applied successfully!");
    console.log("\nCreated tables:");
    console.log("  - guests");
    console.log("  - activities");
    console.log("  - guest_activity_interests");
    console.log("\nTest the connection:");
    console.log("  curl http://localhost:3000/api/test-supabase");
  } catch (error) {
    console.error("\n❌ The automated script approach isn't working.");
    console.error(
      "\n✨ Please run the SQL manually in the Supabase Dashboard (it's easier!):",
    );
    console.error(
      `\n1. Go to: https://app.supabase.com/project/${projectRef}/sql/new`,
    );
    console.error("2. Copy the contents of supabase-schema.sql");
    console.error("3. Paste it into the SQL Editor");
    console.error("4. Click 'Run' or press Cmd+Enter");
    console.error(
      "\nThis will take 30 seconds and you'll see the tables appear immediately!",
    );
    console.error(error);
  }
}

if (process.argv[2]) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.argv[2];
}

setupDatabase();
