/**
 * Role-based access control (RBAC) definitions.
 *
 * This file is the single source of truth for the application's roles.
 * Both the TypeScript layer and (conceptually) the database `user_role`
 * enum are kept in sync with these values. If you add a role here, you
 * MUST also add it to the `user_role` enum via a database migration.
 */

export const USER_ROLES = {
  /** Full control: user management, drivers, audit logs, all settings. */
  ADMIN: "ADMIN",
  /** Operational owner of the transport domain (drivers, trips, assignments). */
  TRANSPORT_SUPERVISOR: "TRANSPORT_SUPERVISOR",
  /** Field staff. Sees only what is assigned to them. */
  DRIVER: "DRIVER",
  /** Leadership: read-only oversight, reports, and audit visibility. */
  MANAGEMENT: "MANAGEMENT",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** All roles as an array (useful for validation and UI). */
export const ALL_ROLES = Object.values(USER_ROLES) as UserRole[];

/** Human-readable labels for the UI. */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  TRANSPORT_SUPERVISOR: "Transport Supervisor",
  DRIVER: "Driver",
  MANAGEMENT: "Management",
};

/** Short labels / badges. */
export const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  TRANSPORT_SUPERVISOR: "Supervisor",
  DRIVER: "Driver",
  MANAGEMENT: "Management",
};

/**
 * Capability groups. Authorize against a capability, never a hard-coded
 * role list scattered through the codebase. Add new capabilities here as
 * later phases (Trips, Assignments) are built.
 */
export const CAPABILITIES = {
  /** Create/update/deactivate user accounts and assign roles. */
  MANAGE_USERS: [USER_ROLES.ADMIN],
  /** Create/update driver records. */
  MANAGE_DRIVERS: [USER_ROLES.ADMIN, USER_ROLES.TRANSPORT_SUPERVISOR],
  /** View the driver roster. */
  VIEW_DRIVERS: [
    USER_ROLES.ADMIN,
    USER_ROLES.TRANSPORT_SUPERVISOR,
    USER_ROLES.MANAGEMENT,
  ],
  /** Read the audit trail. */
  VIEW_AUDIT_LOGS: [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT],
} as const;

export type Capability = keyof typeof CAPABILITIES;

/** Check whether a role is allowed to use a capability. */
export function can(role: UserRole | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[capability] as readonly UserRole[]).includes(role);
}

/** Type guard for untrusted strings (e.g. from query params). */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && ALL_ROLES.includes(value as UserRole);
}
