import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { listDrivers } from "@/lib/data/drivers";
import { enumParam, firstParam } from "@/lib/data/search";
import { can } from "@/lib/constants/roles";
import {
  DRIVER_STATUSES,
  DRIVER_STATUS_LABELS,
  DRIVER_STATUS_VARIANTS,
  LICENSE_TYPES,
  LICENSE_TYPE_LABELS,
} from "@/lib/constants/vocab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/common/filter-bar";

export const metadata: Metadata = { title: "Drivers" };

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCapability("VIEW_DRIVERS");
  const canManage = can(profile.role, "MANAGE_DRIVERS");

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = enumParam(params.status, DRIVER_STATUSES);
  const license = enumParam(params.license, LICENSE_TYPES);

  const drivers = await listDrivers({ q, status, license });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Drivers"
        description={
          canManage
            ? "The driver roster, licence class and availability."
            : "The driver roster. Read-only for your role."
        }
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/drivers/new">
                <Plus className="size-4" />
                New driver
              </Link>
            </Button>
          ) : undefined
        }
      />

      <FilterBar
        action="/drivers"
        query={q}
        queryPlaceholder="Name, employee no., mobile"
        selects={[
          {
            name: "status",
            label: "statuses",
            value: status,
            options: DRIVER_STATUSES.map((s) => ({
              value: s,
              label: DRIVER_STATUS_LABELS[s],
            })),
          },
          {
            name: "license",
            label: "licences",
            value: license,
            options: LICENSE_TYPES.map((l) => ({
              value: l,
              label: LICENSE_TYPE_LABELS[l],
            })),
          },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          {drivers.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No drivers match"
              description="Adjust the search or filters, or add the first driver to the roster."
              action={
                canManage ? (
                  <Button asChild variant="outline">
                    <Link href="/drivers/new">Add a driver</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee no.</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Licence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/drivers/${driver.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {driver.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {driver.employee_id}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {driver.phone || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {LICENSE_TYPE_LABELS[driver.license_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={DRIVER_STATUS_VARIANTS[driver.status]}>
                        {DRIVER_STATUS_LABELS[driver.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {driver.profile?.email ?? "Not linked"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {drivers.length} driver{drivers.length === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
