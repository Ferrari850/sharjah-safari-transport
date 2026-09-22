import "server-only";

import { createClient } from "@/lib/supabase/server";
import { likePattern, sanitizeSearch } from "@/lib/data/search";
import type { UserRole } from "@/lib/constants/roles";
import type { Profile } from "@/types";

export type UserFilters = {
  q?: string;
  role?: UserRole | "";
  active?: "active" | "inactive" | "";
};

/**
 * List profiles for the Users module.
 *
 * Runs through the session-scoped client, so RLS decides what comes back:
 * this returns everything only because the caller is an ADMIN. The
 * capability check in the page is defence in depth, not the boundary.
 */
export async function listUsers(filters: UserFilters = {}): Promise<Profile[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const term = sanitizeSearch(filters.q);
  if (term) {
    const pattern = likePattern(term);
    query = query.or(
      [
        `full_name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `employee_number.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
      ].join(","),
    );
  }

  if (filters.role) query = query.eq("role", filters.role);
  if (filters.active === "active") query = query.eq("is_active", true);
  if (filters.active === "inactive") query = query.eq("is_active", false);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load users: ${error.message}`);
  return data ?? [];
}

export async function getUser(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Profiles that could be linked to a driver record: DRIVER-role accounts
 * that are not already linked to one.
 */
export async function listLinkableDriverProfiles(
  includeProfileId?: string | null,
): Promise<Profile[]> {
  const supabase = await createClient();

  const [{ data: profiles }, { data: drivers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "DRIVER")
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("drivers").select("profile_id"),
  ]);

  const taken = new Set(
    (drivers ?? [])
      .map((d) => d.profile_id)
      .filter((id): id is string => Boolean(id)),
  );

  return (profiles ?? []).filter(
    (p) => !taken.has(p.id) || p.id === includeProfileId,
  );
}

/** How many administrators are still active. Used to guard the last one. */
export async function countActiveAdmins(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "ADMIN")
    .eq("is_active", true);
  return count ?? 0;
}
