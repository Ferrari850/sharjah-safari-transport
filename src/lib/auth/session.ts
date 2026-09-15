import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { can, type Capability, type UserRole } from "@/lib/constants/roles";
import type { Profile } from "@/types";

/**
 * Server-side session + authorization helpers.
 *
 * Every helper here is `cache`-wrapped so that multiple calls within a
 * single request (layout + page + components) hit Supabase only once.
 *
 * Authorization order of trust:
 *   1. Database Row Level Security  (the real boundary)
 *   2. These server-side guards     (UX + defence in depth)
 *   3. Middleware                   (coarse auth boundary only)
 * Never rely on the client for authorization.
 */

/** The authenticated auth user, or null. Revalidated against Supabase. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The current user's profile row (role, name, status), or null. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ?? null;
});

/** Require an authenticated user or redirect to /login. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Require an active profile or redirect. Deactivated accounts are refused. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=account_disabled");
  return profile;
}

/** Require one of the allowed roles, else redirect to the dashboard. */
export async function requireRole(allowed: UserRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) {
    redirect("/dashboard?error=forbidden");
  }
  return profile;
}

/** Require a capability (preferred over hard-coded role lists). */
export async function requireCapability(capability: Capability): Promise<Profile> {
  const profile = await requireProfile();
  if (!can(profile.role, capability)) {
    redirect("/dashboard?error=forbidden");
  }
  return profile;
}
