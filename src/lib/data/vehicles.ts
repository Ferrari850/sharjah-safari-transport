import "server-only";

import { createClient } from "@/lib/supabase/server";
import { likePattern, sanitizeSearch } from "@/lib/data/search";
import type { Vehicle, VehicleStatus, VehicleType } from "@/types";

export type VehicleFilters = {
  q?: string;
  status?: VehicleStatus | "";
  type?: VehicleType | "";
};

export async function listVehicles(
  filters: VehicleFilters = {},
): Promise<Vehicle[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vehicles")
    .select("*")
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
  if (filters.type) query = query.eq("vehicle_type", filters.type);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load vehicles: ${error.message}`);
  return data ?? [];
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}
