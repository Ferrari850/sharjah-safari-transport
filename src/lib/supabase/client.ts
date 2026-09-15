import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";
import { getPublicSupabaseEnv } from "./env";

/**
 * Browser (client component) Supabase client.
 *
 * Uses the public publishable key only. All access is constrained by Row
 * Level Security on the database. Never import the admin client here.
 */
export function createClient() {
  const { url, publishableKey } = getPublicSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
