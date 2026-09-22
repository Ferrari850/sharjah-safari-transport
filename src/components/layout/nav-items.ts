import type { ComponentType } from "react";
import {
  Bus,
  CalendarDays,
  LayoutDashboard,
  ScrollText,
  Truck,
  Users,
} from "lucide-react";

import { can, type Capability, type UserRole } from "@/lib/constants/roles";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** Omitted for items every signed-in user may reach. */
  capability?: Capability;
};

/**
 * The single source of truth for navigation.
 *
 * Items are filtered by capability, so a role never sees a link it cannot
 * use. This is cosmetic only — each page runs its own `requireCapability`
 * and the database enforces access regardless of what the menu shows.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/users", icon: Users, capability: "MANAGE_USERS" },
  { label: "Drivers", href: "/drivers", icon: Truck, capability: "VIEW_DRIVERS" },
  { label: "Vehicles", href: "/vehicles", icon: Bus, capability: "VIEW_VEHICLES" },
  {
    label: "Visits / Trips",
    href: "/visits",
    icon: CalendarDays,
    capability: "VIEW_VISITS",
  },
  {
    label: "Audit Logs",
    href: "/audit",
    icon: ScrollText,
    capability: "VIEW_AUDIT_LOGS",
  },
];

export function navItemsFor(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.capability || can(role, item.capability),
  );
}
