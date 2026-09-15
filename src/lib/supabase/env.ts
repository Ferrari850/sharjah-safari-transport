/**
 * Centralised, validated access to Supabase environment variables.
 *
 * The anon URL/key are public by design (they are protected by Row Level
 * Security). The service-role key is NEVER read here — it lives only in
 * `admin.ts`, which is server-only, so it can never be bundled into
 * client-side JavaScript.
 */

export function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase public env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  return { url, anonKey };
}
