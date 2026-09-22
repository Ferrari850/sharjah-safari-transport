import "server-only";

import { createClient } from "@/lib/supabase/server";
import { likePattern, sanitizeSearch } from "@/lib/data/search";
import type { Visit, VisitStatus, VisitType } from "@/types";

export type VisitFilters = {
  q?: string;
  status?: VisitStatus | "";
  type?: VisitType | "";
  from?: string;
  to?: string;
};

export async function listVisits(
  filters: VisitFilters = {},
): Promise<Visit[]> {
  const supabase = await createClient();

  let query = supabase
    .from("visits")
    .select("*")
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
  if (filters.type) query = query.eq("visit_type", filters.type);
  if (isIsoDate(filters.from)) query = query.gte("visit_date", filters.from!);
  if (isIsoDate(filters.to)) query = query.lte("visit_date", filters.to!);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load visits: ${error.message}`);
  return data ?? [];
}

export async function getVisit(id: string): Promise<Visit | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visits")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/** Every visit inside a calendar month, ordered for day-by-day rendering. */
export async function listVisitsInRange(
  fromIso: string,
  toIso: string,
): Promise<Visit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select("*")
    .gte("visit_date", fromIso)
    .lte("visit_date", toIso)
    .order("visit_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw new Error(`Could not load the calendar: ${error.message}`);
  return data ?? [];
}

/** Guards a date coming from a query parameter before it reaches a filter. */
export function isIsoDate(value: string | undefined | null): boolean {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}
