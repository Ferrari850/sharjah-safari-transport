/**
 * Database schema types.
 *
 * Hand-authored for Phase 1 to match the SQL migrations under
 * `supabase/migrations`. In later phases you can replace this file with
 * the output of `supabase gen types typescript` — keep the exported
 * `Database` shape identical so the rest of the app is unaffected.
 */

import type { UserRole } from "@/lib/constants/roles";

export type DriverStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "SUSPENDED";

/** Fixed vocabulary of auditable actions. Extend as features are added. */
export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "ROLE_CHANGE"
  | "STATUS_CHANGE";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DriverRow = {
  id: string;
  profile_id: string | null;
  employee_id: string;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null; // date
  status: DriverStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at"> &
          Partial<Pick<ProfileRow, "created_at" | "updated_at">>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      drivers: {
        Row: DriverRow;
        Insert: Omit<DriverRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<DriverRow, "id" | "created_at" | "updated_at">>;
        Update: Partial<DriverRow>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "id" | "created_at"> &
          Partial<Pick<AuditLogRow, "id" | "created_at">>;
        // Append-only is enforced in the database (RLS + BEFORE UPDATE/DELETE
        // triggers). This type exists only to satisfy Supabase's generics;
        // the app never issues updates to audit_logs.
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      user_role: UserRole;
      driver_status: DriverStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}
