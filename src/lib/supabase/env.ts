/**
 * Centralised, validated access to Supabase environment variables.
 *
 * The URL and publishable key are public by design (they are protected by
 * Row Level Security). The secret key is NEVER read here — it lives only in
 * `admin.ts`, which is server-only, so it can never be bundled into
 * client-side JavaScript.
 */

export function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase public env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
    );
  }

  return { url, publishableKey };
}
