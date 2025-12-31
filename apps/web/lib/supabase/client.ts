import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { Database } from "./types";

/**
 * Supabase client for client-side operations
 * Uses the anon key which is safe to expose in the browser
 */
export const supabase = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL || "",
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
);
