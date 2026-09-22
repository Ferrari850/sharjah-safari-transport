/**
 * Database schema types.
 *
 * Hand-authored to match the SQL migrations under `supabase/migrations`.
 * In a later phase this file can be replaced with the output of
 * `supabase gen types typescript` — keep the exported `Database` shape
 * identical so the rest of the app is unaffected.
 *
 * Every vocabulary below mirrors a PostgreSQL enum and must stay in sync
 * with it (CLAUDE.md §4).
 */

import type { UserRole } from "@/lib/constants/roles";

/** Operational availability of a driver (migration 0008). */
export type DriverStatus =
  | "AVAILABLE"
  | "BUSY"
  | "LEAVE"
  | "OFF_DUTY"
  | "INACTIVE";

/** What class of vehicle a driver is licensed for (migration 0008). */
export type LicenseType = "LIGHT" | "HEAVY";

/** Vehicle classification (migration 0009). */
export type VehicleType =
  | "BUS"
  | "MINIBUS"
  | "VAN"
  | "SUV"
  | "CAR"
  | "SAFARI_TRUCK";

/** Vehicle availability (migration 0009). */
export type VehicleStatus =
  | "AVAILABLE"
  | "IN_USE"
  | "MAINTENANCE"
  | "OUT_OF_SERVICE"
  | "INACTIVE";

/** Nature of the visiting party (migration 0010). */
export type VisitType = "VIP" | "OFFICIAL" | "SCHOOL" | "REGULAR" | "SPECIAL";

/** Shape of the journey (migration 0010). */
export type TripType = "ONE_WAY" | "ROUND_TRIP" | "SHUTTLE";

/** Lifecycle of a scheduled visit (migration 0010). */
export type VisitStatus = "DRAFT" | "SCHEDULED" | "CANCELLED" | "COMPLETED";

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
  employee_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DriverRow = {
  id: string;
  profile_id: string | null;
  employee_id: string;
  full_name: string;
  phone: string | null;
  license_type: LicenseType;
  status: DriverStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleRow = {
  id: string;
  vehicle_number: string;
  plate_number: string;
  vehicle_type: VehicleType;
  capacity: number;
  status: VehicleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VisitRow = {
  id: string;
  visit_date: string; // date
  start_time: string; // time
  expected_end_time: string | null; // time
  delegation_name: string;
  visit_type: VisitType;
  trip_type: TripType;
  number_of_visitors: number;
  pickup_location: string;
  destination: string;
  notes: string | null;
  status: VisitStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
};

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
      vehicles: {
        Row: VehicleRow;
        Insert: Omit<VehicleRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<VehicleRow, "id" | "created_at" | "updated_at">>;
        Update: Partial<VehicleRow>;
        Relationships: [];
      };
      visits: {
        Row: VisitRow;
        Insert: Omit<VisitRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<VisitRow, "id" | "created_at" | "updated_at">>;
        Update: Partial<VisitRow>;
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
      license_type: LicenseType;
      vehicle_type: VehicleType;
      vehicle_status: VehicleStatus;
      visit_type: VisitType;
      trip_type: TripType;
      visit_status: VisitStatus;
      audit_action: AuditAction;
    };
    CompositeTypes: Record<never, never>;
  };
}
