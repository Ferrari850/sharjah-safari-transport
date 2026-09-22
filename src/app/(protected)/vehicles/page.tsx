import type { Metadata } from "next";
import Link from "next/link";
import { Bus, Plus } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { listVehicles } from "@/lib/data/vehicles";
import { listLookup } from "@/lib/data/lookups";
import { enumParam, firstParam } from "@/lib/data/search";
import { can } from "@/lib/constants/roles";
import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_VARIANTS,
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

export const metadata: Metadata = { title: "Vehicles" };

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCapability("VIEW_VEHICLES");
  const canManage = can(profile.role, "MANAGE_VEHICLES");

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = enumParam(params.status, VEHICLE_STATUSES);
  const typeId = firstParam(params.type);

  const [vehicles, vehicleTypes] = await Promise.all([
    listVehicles({ q, status, typeId }),
    listLookup("vehicle_types"),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Vehicles"
        description={
          canManage
            ? "The fleet register and its availability."
            : "The fleet register. Read-only for your role."
        }
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/vehicles/new">
                <Plus className="size-4" />
                New vehicle
              </Link>
            </Button>
          ) : undefined
        }
      />

      <FilterBar
        action="/vehicles"
        query={q}
        queryPlaceholder="Vehicle or plate number"
        selects={[
          {
            name: "status",
            label: "statuses",
            value: status,
            options: VEHICLE_STATUSES.map((s) => ({
              value: s,
              label: VEHICLE_STATUS_LABELS[s],
            })),
          },
          {
            name: "type",
            label: "types",
            value: typeId,
            options: vehicleTypes.map((t) => ({
              value: t.id,
              label: t.active ? t.name : `${t.name} (retired)`,
            })),
          },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          {vehicles.length === 0 ? (
            <EmptyState
              icon={Bus}
              title="No vehicles match"
              description="Adjust the search or filters, or add the first vehicle to the fleet."
              action={
                canManage ? (
                  <Button asChild variant="outline">
                    <Link href="/vehicles/new">Add a vehicle</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle no.</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {vehicle.vehicle_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.plate_number}
                    </TableCell>
                    <TableCell>
                      {vehicle.vehicle_type?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vehicle.capacity}
                    </TableCell>
                    <TableCell>
                      <Badge variant={VEHICLE_STATUS_VARIANTS[vehicle.status]}>
                        {VEHICLE_STATUS_LABELS[vehicle.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
