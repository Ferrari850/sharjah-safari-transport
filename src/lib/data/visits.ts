import "server-only";

import { createClient } from "@/lib/supabase/server";
import { likePattern, sanitizeSearch } from "@/lib/data/search";
import { UUID_RE } from "@/lib/data/lookups";
import { isIsoDate } from "@/lib/actions/helpers";
import type { VisitStatus, VisitWithTypes } from "@/types";

export type VisitFilters = {
  q?: string;
  status?: VisitStatus | "";
  typeId?: string;
  from?: string;
  to?: string;
};

const WITH_TYPES =
  "*, visit_type:visit_types!visits_visit_type_id_fkey(id, name, active)," +
  " trip_type:trip_types!visits_trip_type_id_fkey(id, name, active)";

export async function listVisits(
  filters: VisitFilters = {},
): Promise<VisitWithTypes[]> {
  const supabase = await createClient();

  let query = supabase
    .from("visits")
    .select(WITH_TYPES)
    .order("visit_date", { ascending: false })
    .order("start_time", { ascending: true });

  const term = sanitizeSearch(filters.q);
  if (term) {
    const pattern = likePattern(term);
    query = query.or(
      [
        `delegation_name.ilike.${pattern}`,
        `pickup_location.ilike.${pattern}`,
        `destination.ilike.${pattern}`,
      ].join(","),
    );
  }

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.typeId && UUID_RE.test(filters.typeId)) {
    query = query.eq("visit_type_id", filters.typeId);
  }
  if (isIsoDate(filters.from)) query = query.gte("visit_date", filters.from!);
  if (isIsoDate(filters.to)) query = query.lte("visit_date", filters.to!);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load visits: ${error.message}`);
  return (data ?? []) as unknown as VisitWithTypes[];
}

export async function getVisit(id: string): Promise<VisitWithTypes | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visits")
    .select(WITH_TYPES)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as VisitWithTypes) ?? null;
}

/** Every visit inside a calendar month, ordered for day-by-day rendering. */
export async function listVisitsInRange(
  fromIso: string,
  toIso: string,
): Promise<VisitWithTypes[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select(WITH_TYPES)
    .gte("visit_date", fromIso)
    .lte("visit_date", toIso)
    .order("visit_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw new Error(`Could not load the calendar: ${error.message}`);
  return (data ?? []) as unknown as VisitWithTypes[];
}

// Re-exported so pages can guard a date query parameter without reaching
// into the actions layer.
export { isIsoDate };
