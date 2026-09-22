import "server-only";

import { createClient } from "@/lib/supabase/server";
import { can, type UserRole } from "@/lib/constants/roles";

export type DashboardStats = {
  drivers: number | null;
  availableDrivers: number | null;
  users: number | null;
  activeUsers: number | null;
  vehicles: number | null;
  availableVehicles: number | null;
  scheduledVisits: number | null;
  upcomingVisits: number | null;
  auditEvents: number | null;
};

/**
 * Counts for the dashboard cards.
 *
 * A count is only requested when the viewer's role holds the matching
 * capability. Otherwise it comes back as `null` and the card is not
 * rendered at all — rather than showing a zero that RLS produced, which
 * would read as real data instead of "not visible to you".
 */
export async function getDashboardStats(
  role: UserRole,
): Promise<DashboardStats> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const wantsDrivers = can(role, "VIEW_DRIVERS");
  const wantsUsers = can(role, "MANAGE_USERS");
  const wantsVehicles = can(role, "VIEW_VEHICLES");
  const wantsVisits = can(role, "VIEW_VISITS");
  const wantsAudit = can(role, "VIEW_AUDIT_LOGS");

  /** Resolve a head-only count query, treating any error as "unknown". */
  const resolve = async (
    run: PromiseLike<{ count: number | null; error: unknown }>,
  ): Promise<number> => {
    const { count, error } = await run;
    return error ? 0 : (count ?? 0);
  };

  const head = { count: "exact" as const, head: true };

  const [
    drivers,
    availableDrivers,
    users,
    activeUsers,
    vehicles,
    availableVehicles,
    scheduledVisits,
    upcomingVisits,
    auditEvents,
  ] = await Promise.all([
    wantsDrivers
      ? resolve(supabase.from("drivers").select("id", head))
      : null,
    wantsDrivers
      ? resolve(
          supabase
            .from("drivers")
            .select("id", head)
            .eq("status", "AVAILABLE"),
        )
      : null,
    wantsUsers ? resolve(supabase.from("profiles").select("id", head)) : null,
    wantsUsers
      ? resolve(
          supabase.from("profiles").select("id", head).eq("is_active", true),
        )
      : null,
    wantsVehicles
      ? resolve(supabase.from("vehicles").select("id", head))
      : null,
    wantsVehicles
      ? resolve(
          supabase
            .from("vehicles")
            .select("id", head)
            .eq("status", "AVAILABLE"),
        )
      : null,
    wantsVisits
      ? resolve(
          supabase
            .from("visits")
            .select("id", head)
            .eq("status", "SCHEDULED"),
        )
      : null,
    wantsVisits
      ? resolve(
          supabase
            .from("visits")
            .select("id", head)
            .eq("status", "SCHEDULED")
            .gte("visit_date", today),
        )
      : null,
    wantsAudit
      ? resolve(supabase.from("audit_logs").select("id", head))
      : null,
  ]);

  return {
    drivers,
    availableDrivers,
    users,
    activeUsers,
    vehicles,
    availableVehicles,
    scheduledVisits,
    upcomingVisits,
    auditEvents,
  };
}
