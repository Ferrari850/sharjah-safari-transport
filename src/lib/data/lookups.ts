import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Lookup, LookupTable } from "@/types";

/** Human labels for the three editable vocabularies. */
export const LOOKUP_LABELS: Record<LookupTable, { singular: string; plural: string }> =
  {
    vehicle_types: { singular: "Vehicle type", plural: "Vehicle types" },
    trip_types: { singular: "Trip type", plural: "Trip types" },
    visit_types: { singular: "Visit type", plural: "Visit types" },
  };

export const LOOKUP_TABLES = Object.keys(LOOKUP_LABELS) as LookupTable[];

/**
 * Read one vocabulary.
 *
 * `activeOnly` is what forms use, so a retired type cannot be picked for new
 * records while existing records that still reference it keep displaying
 * correctly.
 */
export async function listLookup(
  table: LookupTable,
  { activeOnly = false }: { activeOnly?: boolean } = {},
): Promise<Lookup[]> {
  const supabase = await createClient();

  let query = supabase.from(table).select("*").order("name");
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) {
    throw new Error(
      `Could not load ${LOOKUP_LABELS[table].plural.toLowerCase()}: ${error.message}`,
    );
  }
  return data ?? [];
}

/** Every vocabulary at once, for the settings screen. */
export async function listAllLookups(): Promise<Record<LookupTable, Lookup[]>> {
  const [vehicleTypes, tripTypes, visitTypes] = await Promise.all(
    LOOKUP_TABLES.map((table) => listLookup(table)),
  );
  return {
    vehicle_types: vehicleTypes,
    trip_types: tripTypes,
    visit_types: visitTypes,
  };
}

export async function getLookup(
  table: LookupTable,
  id: string,
): Promise<Lookup | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Confirm a value submitted by the browser names a real, selectable type.
 *
 * The foreign key already guarantees the row exists; this additionally
 * refuses a *retired* type, which the database cannot express, and refuses
 * anything that is not a well-formed id before it reaches a query.
 *
 * `allowId` lets an edit keep a type that has since been retired, so saving
 * an unrelated field on an old record does not force a vocabulary change.
 */
export async function isSelectableLookup(
  table: LookupTable,
  id: string,
  allowId?: string | null,
): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  if (allowId && id === allowId) {
    return (await getLookup(table, id)) !== null;
  }
  const row = await getLookup(table, id);
  return row !== null && row.active;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export { UUID_RE };
