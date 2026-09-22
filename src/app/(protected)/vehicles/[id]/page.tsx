import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { getVehicle } from "@/lib/data/vehicles";
import { firstParam } from "@/lib/data/search";
import { can } from "@/lib/constants/roles";
import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_VARIANTS,
  VEHICLE_TYPE_LABELS,
} from "@/lib/constants/vocab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmAction } from "@/components/common/confirm-action";
import { SubmitButton } from "@/components/common/submit-button";
import { VehicleForm } from "../vehicle-form";
import { changeVehicleStatusAction, updateVehicleAction } from "../actions";

export const metadata: Metadata = { title: "Vehicle" };

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCapability("VIEW_VEHICLES");
  const canManage = can(profile.role, "MANAGE_VEHICLES");

  const { id } = await params;
  const vehicle = await getVehicle(id);
  if (!vehicle) notFound();

  const error = firstParam((await searchParams).error);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/vehicles">
          <ArrowLeft className="size-4" />
          All vehicles
        </Link>
      </Button>

      <PageHeader
        title={vehicle.vehicle_number}
        description={`${VEHICLE_TYPE_LABELS[vehicle.vehicle_type]} · ${vehicle.plate_number} · ${vehicle.capacity} seats`}
        actions={
          <Badge variant={VEHICLE_STATUS_VARIANTS[vehicle.status]}>
            {VEHICLE_STATUS_LABELS[vehicle.status]}
          </Badge>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle record</CardTitle>
            <CardDescription>Read-only for your role.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Plate number" value={vehicle.plate_number} />
            <Detail
              label="Type"
              value={VEHICLE_TYPE_LABELS[vehicle.vehicle_type]}
            />
            <Detail label="Capacity" value={`${vehicle.capacity} seats`} />
            <Detail
              label="Status"
              value={VEHICLE_STATUS_LABELS[vehicle.status]}
            />
            <Detail label="Notes" value={vehicle.notes ?? "—"} full />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vehicle details</CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleForm action={updateVehicleAction} vehicle={vehicle} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>
                Status changes are recorded in the audit trail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={changeVehicleStatusAction} className="space-y-4">
                <input type="hidden" name="id" value={vehicle.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      id="status"
                      name="status"
                      defaultValue={vehicle.status}
                    >
                      {VEHICLE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {VEHICLE_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (optional)</Label>
                    <Textarea id="reason" name="reason" rows={2} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <SubmitButton variant="secondary" pendingLabel="Updating…">
                    Update status
                  </SubmitButton>
                </div>
              </form>

              {vehicle.status !== "INACTIVE" && (
                <div className="flex justify-end border-t pt-4">
                  <ConfirmAction
                    action={changeVehicleStatusAction}
                    fields={{ id: vehicle.id, status: "INACTIVE" }}
                    trigger="Deactivate vehicle"
                    triggerVariant="destructive"
                    title="Deactivate this vehicle?"
                    description={`${vehicle.vehicle_number} will be marked inactive and excluded from future scheduling. The record is kept.`}
                    confirmLabel="Deactivate"
                    withReason
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
