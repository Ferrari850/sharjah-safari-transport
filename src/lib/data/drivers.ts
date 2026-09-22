import "server-only";

import { createClient } from "@/lib/supabase/server";
import { likePattern, sanitizeSearch } from "@/lib/data/search";
import type { Driver, DriverStatus, DriverWithProfile, LicenseType } from "@/types";

export type DriverFilters = {
  q?: string;
  status?: DriverStatus | "";
  license?: LicenseType | "";
};

const WITH_PROFILE =
  "*, profile:profiles!drivers_profile_id_fkey(id, email, full_name, role, is_active)";

export async function listDrivers(
  filters: DriverFilters = {},
): Promise<DriverWithProfile[]> {
  const supabase = await createClient();

  let query = supabase
    .from("drivers")
    .select(WITH_PROFILE)
    .order("full_name", { ascending: true });

  const term = sanitizeSearch(filters.q);
  if (term) {
    const pattern = likePattern(term);
    query = query.or(
      [
        `full_name.ilike.${pattern}`,
        `employee_id.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
      ].join(","),
    );
  }

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.license) query = query.eq("license_type", filters.license);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load drivers: ${error.message}`);
  return (data ?? []) as unknown as DriverWithProfile[];
}

export async function getDriver(id: string): Promise<DriverWithProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drivers")
    .select(WITH_PROFILE)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as DriverWithProfile) ?? null;
}

/** The driver record linked to a given login, if any. */
export async function getDriverForProfile(
  profileId: string,
): Promise<Driver | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drivers")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data ?? null;
}
