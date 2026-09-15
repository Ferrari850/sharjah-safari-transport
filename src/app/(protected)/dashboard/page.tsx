import type { Metadata } from "next";
import { Truck, Users, ScrollText, ShieldCheck } from "lucide-react";

import { requireProfile } from "@/lib/auth/session";
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

export default async function DashboardPage() {
  const profile = await requireProfile();
  const firstName = (profile.full_name || profile.email).split(" ")[0];

  const stats = [
    {
      label: "Drivers",
      value: "—",
      hint: "Phase 2",
      icon: Truck,
      show: can(profile.role, "VIEW_DRIVERS"),
    },
    {
      label: "Users",
      value: "—",
      hint: "Phase 2",
      icon: Users,
      show: can(profile.role, "MANAGE_USERS"),
    },
    {
      label: "Audit events",
      value: "—",
      hint: "Phase 2",
      icon: ScrollText,
      show: can(profile.role, "VIEW_AUDIT_LOGS"),
    },
  ].filter((s) => s.show);

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

      {stats.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.hint}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <CardTitle>Phase 1 — Foundation ready</CardTitle>
          </div>
          <CardDescription>
            Authentication, roles, and the secure data foundation are in place.
            Operational modules arrive in the next phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <span>Authentication &amp; sessions</span>
            <Badge variant="success">Live</Badge>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span>Role-based access control</span>
            <Badge variant="success">Live</Badge>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span>Profiles &amp; drivers data model</span>
            <Badge variant="success">Live</Badge>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span>Append-only audit trail</span>
            <Badge variant="success">Live</Badge>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span>Trips &amp; scheduling</span>
            <Badge variant="secondary">Phase 2</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Assignments &amp; dispatch</span>
            <Badge variant="secondary">Phase 3</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
