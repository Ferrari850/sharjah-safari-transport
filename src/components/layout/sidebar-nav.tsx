import Link from "next/link";
import { LayoutDashboard, Users, Truck, ScrollText } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { can, type Capability, type UserRole } from "@/lib/constants/roles";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  capability?: Capability;
  /** Not yet built — shown disabled with a "Soon" tag. */
  comingSoon?: boolean;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Drivers",
    href: "/dashboard",
    icon: Truck,
    capability: "VIEW_DRIVERS",
    comingSoon: true,
  },
  {
    label: "Users",
    href: "/dashboard",
    icon: Users,
    capability: "MANAGE_USERS",
    comingSoon: true,
  },
  {
    label: "Audit Logs",
    href: "/dashboard",
    icon: ScrollText,
    capability: "VIEW_AUDIT_LOGS",
    comingSoon: true,
  },
];

export function SidebarNav({ role }: { role: UserRole }) {
  const items = NAV.filter((item) => !item.capability || can(role, item.capability));

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = item.icon;

        if (item.comingSoon) {
          return (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/70"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" />
                {item.label}
              </span>
              <Badge variant="outline" className="text-[10px]">
                Soon
              </Badge>
            </div>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
