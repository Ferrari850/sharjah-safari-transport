import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";
import { getPublicSupabaseEnv } from "./env";

/**
 * Server (Server Component / Route Handler / Server Action) Supabase client.
 *
 * Reads and writes the session cookies. Uses the publishable key + the
 * signed-in user's session, so every query is still subject to Row Level
 * Security — this client has no elevated privileges.
 *
 * NOTE: cookie writes from a Server Component are a no-op (Next.js forbids
 * them); the middleware is responsible for refreshing the session cookie.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore because the
          // middleware refreshes the session on every request.
        }
      },
    },
  });
}
