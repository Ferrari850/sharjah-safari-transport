import type {
  ProfileRow,
  DriverRow,
  LookupRow,
  VehicleRow,
  VisitRow,
  AuditLogRow,
  DriverStatus,
  LicenseType,
  VehicleStatus,
  VisitStatus,
  AuditAction,
} from "./database.types";

export type Profile = ProfileRow;
export type Driver = DriverRow;
export type Vehicle = VehicleRow;
export type Visit = VisitRow;
export type AuditLog = AuditLogRow;

/** A row from one of the editable vocabularies. */
export type Lookup = LookupRow;

/** Which vocabulary a lookup row belongs to. */
export type LookupTable = "vehicle_types" | "trip_types" | "visit_types";

/** The lookup shape embedded by a joined query — no timestamps needed. */
export type LookupRef = Pick<Lookup, "id" | "name" | "active">;

/** A driver row joined to the profile it is linked to, where there is one. */
export type DriverWithProfile = Driver & {
  profile: Pick<
    Profile,
    "id" | "email" | "full_name" | "role" | "is_active"
  > | null;
};

/** A vehicle joined to its type name. */
export type VehicleWithType = Vehicle & {
  vehicle_type: LookupRef | null;
};

/** A visit joined to both of its type names. */
export type VisitWithTypes = Visit & {
  visit_type: LookupRef | null;
  trip_type: LookupRef | null;
};

export type {
  DriverStatus,
  LicenseType,
  VehicleStatus,
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
