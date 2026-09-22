/**
 * Display vocabulary for the database enums.
 *
 * Each map is keyed by the exact enum value stored in PostgreSQL, so adding
 * a value to an enum without adding it here is a type error — which is the
 * point: the vocabularies cannot drift silently (CLAUDE.md §4).
 *
 * `variant` values are Badge variants; colours come from the theme tokens,
 * never hard-coded here.
 */

import type {
  DriverStatus,
  LicenseType,
  VehicleStatus,
  VisitStatus,
  AuditAction,
} from "@/types/database.types";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive";

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------
export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  LEAVE: "On leave",
  OFF_DUTY: "Off duty",
  INACTIVE: "Inactive",
};

export const DRIVER_STATUS_VARIANTS: Record<DriverStatus, BadgeVariant> = {
  AVAILABLE: "success",
  BUSY: "warning",
  LEAVE: "secondary",
  OFF_DUTY: "outline",
  INACTIVE: "destructive",
};

export const DRIVER_STATUSES = Object.keys(
  DRIVER_STATUS_LABELS,
) as DriverStatus[];

export const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  LIGHT: "Light vehicle",
  HEAVY: "Heavy vehicle",
};

export const LICENSE_TYPES = Object.keys(LICENSE_TYPE_LABELS) as LicenseType[];

// ---------------------------------------------------------------------------
// Vehicles
//
// `vehicle_type` is NOT here: it is a lookup table (migration 0009) so
// operations can edit the vocabulary without a migration. Only the workflow
// state is a fixed enum.
// ---------------------------------------------------------------------------
export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Available",
  IN_USE: "In use",
  MAINTENANCE: "Maintenance",
  OUT_OF_SERVICE: "Out of service",
  INACTIVE: "Inactive",
};

export const VEHICLE_STATUS_VARIANTS: Record<VehicleStatus, BadgeVariant> = {
  AVAILABLE: "success",
  IN_USE: "warning",
  MAINTENANCE: "secondary",
  OUT_OF_SERVICE: "destructive",
  INACTIVE: "destructive",
};

export const VEHICLE_STATUSES = Object.keys(
  VEHICLE_STATUS_LABELS,
) as VehicleStatus[];

// ---------------------------------------------------------------------------
// Visits
//
// `visit_type` and `trip_type` are lookup tables (migration 0010), for the
// same reason. `visit_status` is a workflow state the app branches on, so it
// stays an enum.
// ---------------------------------------------------------------------------
export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export const VISIT_STATUS_VARIANTS: Record<VisitStatus, BadgeVariant> = {
  DRAFT: "outline",
  SCHEDULED: "success",
  CANCELLED: "destructive",
  COMPLETED: "secondary",
};

export const VISIT_STATUSES = Object.keys(
  VISIT_STATUS_LABELS,
) as VisitStatus[];

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  INSERT: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  ROLE_CHANGE: "Role changed",
  STATUS_CHANGE: "Status changed",
};

export const AUDIT_ACTION_VARIANTS: Record<AuditAction, BadgeVariant> = {
  INSERT: "success",
  UPDATE: "secondary",
  DELETE: "destructive",
  LOGIN: "outline",
  LOGOUT: "outline",
  ROLE_CHANGE: "warning",
  STATUS_CHANGE: "warning",
};

export const AUDIT_ACTIONS = Object.keys(
  AUDIT_ACTION_LABELS,
) as AuditAction[];

/** Entity types this app writes to the audit trail. */
export const AUDIT_ENTITY_TYPES = [
  "auth",
  "profiles",
  "drivers",
  "vehicles",
  "vehicle_types",
  "visits",
  "trip_types",
  "visit_types",
] as const;
