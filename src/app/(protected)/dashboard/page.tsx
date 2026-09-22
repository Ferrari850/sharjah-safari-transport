import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  Bus,
  CalendarDays,
  ScrollText,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";

import { requireProfile } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/data/stats";
import { can } from "@/lib/constants/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/common/role-badge";

export const metadata: Metadata = {
  title: "Dashboard",
};

type StatCard = {
  label: string;
  value: number | null;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
};

export default async function DashboardPage() {
  const profile = await requireProfile();
  const firstName = (profile.full_name || profile.email).split(" ")[0];
  const stats = await getDashboardStats(profile.role);

  const allCards: StatCard[] = [
    {
      label: "Drivers",
      value: stats.drivers,
      hint: `${stats.availableDrivers ?? 0} available`,
      icon: Truck,
      href: "/drivers",
    },
    {
      label: "Users",
      value: stats.users,
      hint: `${stats.activeUsers ?? 0} active`,
      icon: Users,
      href: "/users",
    },
    {
      label: "Vehicles",
      value: stats.vehicles,
      hint: `${stats.availableVehicles ?? 0} available`,
      icon: Bus,
      href: "/vehicles",
    },
    {
      label: "Scheduled visits",
      value: stats.scheduledVisits,
      hint: `${stats.upcomingVisits ?? 0} upcoming`,
      icon: CalendarDays,
      href: "/visits",
    },
    {
      label: "Audit events",
      value: stats.auditEvents,
      hint: "Append-only history",
      icon: ScrollText,
      href: "/audit",
    },
  ];

  const cards = allCards.filter((card) => card.value !== null);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sharjah Safari Transport Management System
          </p>
        </div>
        <RoleBadge role={profile.role} />
      </div>

      {cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.label} href={card.href} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </CardTitle>
                    <Icon className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{card.value}</div>
                    <p className="text-xs text-muted-foreground">{card.hint}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <CardTitle>Phase 2 — Operations</CardTitle>
          </div>
          <CardDescription>
            Master data and visit scheduling are live. Assignment and dispatch
            arrive in Phase 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ModuleRow label="Authentication & sessions" status="Live" />
          <ModuleRow label="Role-based access control" status="Live" />
          <ModuleRow label="Append-only audit trail" status="Live" />
          <ModuleRow
            label="User management"
            status={can(profile.role, "MANAGE_USERS") ? "Live" : "Restricted"}
          />
          <ModuleRow
            label="Drivers"
            status={can(profile.role, "VIEW_DRIVERS") ? "Live" : "Restricted"}
          />
          <ModuleRow
            label="Vehicles"
            status={can(profile.role, "VIEW_VEHICLES") ? "Live" : "Restricted"}
          />
          <ModuleRow
            label="Visits & scheduling"
            status={can(profile.role, "VIEW_VISITS") ? "Live" : "Restricted"}
          />
          <div className="flex items-center justify-between">
            <span>Assignments &amp; dispatch</span>
            <Badge variant="secondary">Phase 3</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ModuleRow({
  label,
  status,
}: {
  label: string;
  status: "Live" | "Restricted";
}) {
  return (
    <div className="flex items-center justify-between border-b pb-2">
      <span>{label}</span>
      <Badge variant={status === "Live" ? "success" : "outline"}>
        {status === "Live" ? "Live" : "No access"}
      </Badge>
    </div>
  );
}
