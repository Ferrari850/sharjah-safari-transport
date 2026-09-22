import "server-only";

import { createClient } from "@/lib/supabase/server";
import { likePattern, sanitizeSearch } from "@/lib/data/search";
import { UUID_RE } from "@/lib/data/lookups";
import type { VehicleStatus, VehicleWithType } from "@/types";

export type VehicleFilters = {
  q?: string;
  status?: VehicleStatus | "";
  typeId?: string;
};

const WITH_TYPE =
  "*, vehicle_type:vehicle_types!vehicles_vehicle_type_id_fkey(id, name, active)";

export async function listVehicles(
  filters: VehicleFilters = {},
): Promise<VehicleWithType[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vehicles")
    .select(WITH_TYPE)
    .order("vehicle_number", { ascending: true });

  const term = sanitizeSearch(filters.q);
  if (term) {
    const pattern = likePattern(term);
    query = query.or(
      [
        `vehicle_number.ilike.${pattern}`,
        `plate_number.ilike.${pattern}`,
      ].join(","),
    );
  }

  if (filters.status) query = query.eq("status", filters.status);
  // Guard the shape before it reaches a filter: a lookup id is always a uuid.
  if (filters.typeId && UUID_RE.test(filters.typeId)) {
    query = query.eq("vehicle_type_id", filters.typeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load vehicles: ${error.message}`);
  return (data ?? []) as unknown as VehicleWithType[];
}

export async function getVehicle(
  id: string,
): Promise<VehicleWithType | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select(WITH_TYPE)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as VehicleWithType) ?? null;
}
