import "server-only";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import type { AuditAction } from "@/types/database.types";

interface AuditInput {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Write an entry to the append-only audit trail.
 *
 * Uses the privileged secret-key client so the write always succeeds
 * regardless of the caller's RLS grants, but the actor is taken from the
 * *server-verified*
 * session — it can never be spoofed by the client. The table itself blocks
 * UPDATE/DELETE via database triggers, so entries can be added but never
 * altered, even by this privileged client.
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
      metadata: input.metadata ?? null,
      ip_address: ip,
    });
  } catch (error) {
    console.error("[audit] failed to record audit log", error);
  }
}
