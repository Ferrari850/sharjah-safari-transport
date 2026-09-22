import type {
  ProfileRow,
  DriverRow,
  VehicleRow,
  VisitRow,
  AuditLogRow,
  DriverStatus,
  LicenseType,
  VehicleType,
  VehicleStatus,
  VisitType,
  TripType,
  VisitStatus,
  AuditAction,
} from "./database.types";

export type Profile = ProfileRow;
export type Driver = DriverRow;
export type Vehicle = VehicleRow;
export type Visit = VisitRow;
export type AuditLog = AuditLogRow;

/** A driver row joined to the profile it is linked to, where there is one. */
export type DriverWithProfile = Driver & {
  profile: Pick<Profile, "id" | "email" | "full_name" | "role" | "is_active"> | null;
};

export type {
  DriverStatus,
  LicenseType,
  VehicleType,
  VehicleStatus,
  VisitType,
  TripType,
  VisitStatus,
  AuditAction,
};
export type { UserRole } from "@/lib/constants/roles";

/**
 * Result of a Server Action driving a form. Actions never throw at the
 * client: they return a message the form renders.
 */
export type ActionState = {
  error?: string;
  success?: string;
};
