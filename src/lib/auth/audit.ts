import "server-only";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import type { AuditAction } from "@/types/database.types";

type AuditValue = Record<string, unknown> | null;

interface AuditInput {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  /** State before the change, for UPDATE / ROLE_CHANGE / STATUS_CHANGE. */
  oldValue?: AuditValue;
  /** State after the change. */
  newValue?: AuditValue;
  /** Operator-supplied justification, where the UI collects one. */
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Write an entry to the append-only audit trail.
 *
 * Uses the privileged secret-key client so the write always succeeds
 * regardless of the caller's RLS grants, but the actor is taken from the
 * *server-verified* session — it can never be spoofed by the client. The
 * table itself blocks UPDATE/DELETE via database triggers, so entries can
 * be added but never altered, even by this privileged client.
 *
 * Audit logging must never break the primary operation: failures are
 * swallowed and logged to the server console only.
 */
export async function recordAuditLog(input: AuditInput): Promise<void> {
  try {
    const profile = await getCurrentProfile();

    let ip: string | null = null;
    try {
      const h = await headers();
      ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null;
    } catch {
      ip = null;
    }

    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: profile?.id ?? null,
      actor_email: profile?.email ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      description: input.description ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      reason: input.reason?.trim() || null,
      metadata: input.metadata ?? null,
      ip_address: ip,
    });
  } catch (error) {
    console.error("[audit] failed to record audit log", error);
  }
}

/**
 * Narrow two records to only the keys whose values actually changed, so an
 * audit row carries the diff rather than a full before/after dump.
 *
 * Returns `null` for both sides when nothing changed, which lets a caller
 * skip writing a meaningless "updated, but nothing differs" entry.
 */
export function diffValues<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): { oldValue: AuditValue; newValue: AuditValue; changed: string[] } {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  const changed: string[] = [];

  for (const key of Object.keys(after) as (keyof T & string)[]) {
    const next = after[key];
    if (next === undefined) continue;
    if (Object.is(before[key], next)) continue;

    oldValue[key] = before[key] ?? null;
    newValue[key] = next ?? null;
    changed.push(key);
  }

  return {
    oldValue: changed.length ? oldValue : null,
    newValue: changed.length ? newValue : null,
    changed,
  };
}
