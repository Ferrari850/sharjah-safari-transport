import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Privileged (secret key) Supabase client. SERVER-ONLY.
 *
 * The `import "server-only"` above makes the build FAIL if this module is
 * ever imported into a client component, guaranteeing the secret key can
 * never reach the browser. `SUPABASE_SECRET_KEY` deliberately carries no
 * `NEXT_PUBLIC_` prefix, so Next.js will not inline it into client bundles.
 *
 * This client BYPASSES Row Level Security. Use it only for trusted,
 * server-side privileged operations (e.g. an admin creating a user,
 * writing audit logs) and always perform your own authorization check
 * (see `requireRole`) BEFORE calling it.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing Supabase admin env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (server-side only).",
    );
  }

  return createSupabaseClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
