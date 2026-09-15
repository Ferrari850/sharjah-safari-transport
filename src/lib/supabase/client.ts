import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";
import { getPublicSupabaseEnv } from "./env";

/**
 * Browser (client component) Supabase client.
 *
 * Uses the public anon key only. All access is constrained by Row Level
 * Security on the database. Never import the admin client here.
 */
export function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
