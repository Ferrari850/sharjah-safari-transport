import type { ComponentType } from "react";
import {
  Bus,
  CalendarDays,
  LayoutDashboard,
  ScrollText,
  Tags,
  Truck,
  Users,
} from "lucide-react";

import { can, type Capability, type UserRole } from "@/lib/constants/roles";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export type NavItem = {
  /** Message key rather than literal text, so navigation is translatable. */
  labelKey: MessageKey;
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
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.users", href: "/users", icon: Users, capability: "MANAGE_USERS" },
  { labelKey: "nav.drivers", href: "/drivers", icon: Truck, capability: "VIEW_DRIVERS" },
  { labelKey: "nav.vehicles", href: "/vehicles", icon: Bus, capability: "VIEW_VEHICLES" },
  {
    labelKey: "nav.visits",
    href: "/visits",
    icon: CalendarDays,
    capability: "VIEW_VISITS",
  },
  {
    labelKey: "nav.audit",
    href: "/audit",
    icon: ScrollText,
    capability: "VIEW_AUDIT_LOGS",
  },
  {
    labelKey: "nav.types",
    href: "/settings/types",
    icon: Tags,
    capability: "MANAGE_LOOKUPS",
  },
];

export function navItemsFor(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.capability || can(role, item.capability),
  );
}
