import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { getDriver } from "@/lib/data/drivers";
import { listLinkableDriverProfiles } from "@/lib/data/users";
import { firstParam } from "@/lib/data/search";
import { can } from "@/lib/constants/roles";
import {
  DRIVER_STATUSES,
  DRIVER_STATUS_LABELS,
  DRIVER_STATUS_VARIANTS,
  LICENSE_TYPE_LABELS,
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
import { DriverForm } from "../driver-form";
import { changeDriverStatusAction, updateDriverAction } from "../actions";

export const metadata: Metadata = { title: "Driver" };

export default async function DriverDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCapability("VIEW_DRIVERS");
  const canManage = can(profile.role, "MANAGE_DRIVERS");

  const { id } = await params;
  const driver = await getDriver(id);
  if (!driver) notFound();

  const error = firstParam((await searchParams).error);
  const linkableProfiles = canManage
    ? await listLinkableDriverProfiles(driver.profile_id)
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ms-2">
        <Link href="/drivers">
          <ArrowLeft className="size-4" />
          All drivers
        </Link>
      </Button>

      <PageHeader
        title={driver.full_name}
        description={`Employee ${driver.employee_id}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {LICENSE_TYPE_LABELS[driver.license_type]}
            </Badge>
            {driver.license_expiry &&
              driver.license_expiry < new Date().toISOString().slice(0, 10) && (
                <Badge variant="destructive">Licence expired</Badge>
              )}
            <Badge variant={DRIVER_STATUS_VARIANTS[driver.status]}>
              {DRIVER_STATUS_LABELS[driver.status]}
            </Badge>
          </div>
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
            <CardTitle className="text-base">Driver record</CardTitle>
            <CardDescription>Read-only for your role.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Mobile" value={driver.phone ?? "—"} />
            <Detail
              label="Licence"
              value={LICENSE_TYPE_LABELS[driver.license_type]}
            />
            <Detail
              label="Licence expiry"
              value={
                driver.license_expiry
                  ? new Date(`${driver.license_expiry}T00:00:00`).toLocaleDateString("en-GB")
                  : "—"
              }
            />
            <Detail
              label="Linked login"
              value={driver.profile?.email ?? "Not linked"}
            />
            <Detail
              label="Status"
              value={DRIVER_STATUS_LABELS[driver.status]}
            />
            <Detail label="Notes" value={driver.notes ?? "—"} full />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Driver details</CardTitle>
            </CardHeader>
            <CardContent>
              <DriverForm
                action={updateDriverAction}
                driver={driver}
                linkableProfiles={linkableProfiles}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Availability</CardTitle>
              <CardDescription>
                Status changes are recorded in the audit trail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={changeDriverStatusAction} className="space-y-4">
                <input type="hidden" name="id" value={driver.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select id="status" name="status" defaultValue={driver.status}>
                      {DRIVER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {DRIVER_STATUS_LABELS[status]}
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

              {driver.status !== "INACTIVE" && (
                <div className="flex justify-end border-t pt-4">
                  <ConfirmAction
                    action={changeDriverStatusAction}
                    fields={{ id: driver.id, status: "INACTIVE" }}
                    trigger="Deactivate driver"
                    triggerVariant="destructive"
                    title="Deactivate this driver?"
                    description={`${driver.full_name} will be marked inactive and excluded from future scheduling. The record is kept.`}
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
