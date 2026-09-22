import "server-only";

import { createClient } from "@/lib/supabase/server";
import { likePattern, sanitizeSearch } from "@/lib/data/search";
import type { AuditAction, AuditLog } from "@/types";

export type AuditFilters = {
  q?: string;
  action?: AuditAction | "";
  entity?: string;
};

/** Cap on rows returned to the viewer; the trail itself is never truncated. */
export const AUDIT_PAGE_SIZE = 100;

export async function listAuditLogs(
  filters: AuditFilters = {},
): Promise<AuditLog[]> {
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(AUDIT_PAGE_SIZE);

  const term = sanitizeSearch(filters.q);
  if (term) {
    const pattern = likePattern(term);
    query = query.or(
      [
        `actor_email.ilike.${pattern}`,
        `description.ilike.${pattern}`,
        `entity_type.ilike.${pattern}`,
      ].join(","),
    );
  }

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entity) query = query.eq("entity_type", filters.entity);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load the audit trail: ${error.message}`);
  return data ?? [];
}
