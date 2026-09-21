"use server";

import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/auth/audit";

/**
 * Record a completed password change in the append-only audit trail.
 *
 * The actor is resolved server-side from the verified session (here and
 * again inside `recordAuditLog`), so a client can never attribute a
 * password change to someone else, and a caller without a session records
 * nothing at all.
 *
 * This reuses the existing `UPDATE` audit action rather than introducing a
 * new enum value, so no migration is needed and the `audit_action` enum
 * stays in sync with `database.types.ts` (CLAUDE.md §4).
 */
export async function recordPasswordChange(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await recordAuditLog({
    action: "UPDATE",
    entityType: "auth",
    entityId: user.id,
    description: "Password updated via account recovery",
  });
}
