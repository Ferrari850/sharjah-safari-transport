import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Service-role Supabase client. SERVER-ONLY.
 *
 * The `import "server-only"` above makes the build FAIL if this module is
 * ever imported into a client component, guaranteeing the service-role
 * key can never reach the browser.
 *
 * This client BYPASSES Row Level Security. Use it only for trusted,
 * server-side privileged operations (e.g. an admin creating a user,
 * writing audit logs) and always perform your own authorization check
 * (see `requireRole`) BEFORE calling it.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-side only).",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
