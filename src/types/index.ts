import type {
  ProfileRow,
  DriverRow,
  AuditLogRow,
  DriverStatus,
  AuditAction,
} from "./database.types";

export type Profile = ProfileRow;
export type Driver = DriverRow;
export type AuditLog = AuditLogRow;

export type { DriverStatus, AuditAction };
export type { UserRole } from "@/lib/constants/roles";
