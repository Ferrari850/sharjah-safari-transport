import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { getVisit } from "@/lib/data/visits";
import { firstParam } from "@/lib/data/search";
import { can } from "@/lib/constants/roles";
import {
  VISIT_STATUS_LABELS,
  VISIT_STATUS_VARIANTS,
} from "@/lib/constants/vocab";
import { listLookup } from "@/lib/data/lookups";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmAction } from "@/components/common/confirm-action";
import { VisitForm } from "../visit-form";
import { cancelVisitAction, updateVisitAction } from "../actions";

export const metadata: Metadata = { title: "Visit" };

export default async function VisitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCapability("VIEW_VISITS");
  const canManage = can(profile.role, "MANAGE_VISITS");

  const { id } = await params;
  const visit = await getVisit(id);
  if (!visit) notFound();

  const error = firstParam((await searchParams).error);
  const cancelled = visit.status === "CANCELLED";

  // Active vocabularies, plus whatever this visit already uses, so a retired
  // type remains visible on the record that references it.
  const editable = canManage && !cancelled;
  const [activeVisitTypes, activeTripTypes] = editable
    ? await Promise.all([
        listLookup("visit_types", { activeOnly: true }),
        listLookup("trip_types", { activeOnly: true }),
      ])
    : [[], []];
  const withCurrent = (active: typeof activeVisitTypes, current: typeof visit.visit_type) =>
    current && !active.some((t) => t.id === current.id)
      ? [...active, { ...current, created_at: "" }]
      : active;
  const prettyDate = new Date(`${visit.visit_date}T00:00:00`).toLocaleDateString(
    "en-GB",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ms-2">
        <Link href="/visits">
          <ArrowLeft className="size-4" />
          All visits
        </Link>
      </Button>

      <PageHeader
        title={visit.delegation_name}
        description={`${prettyDate} · ${visit.start_time.slice(0, 5)}${
          visit.expected_end_time
            ? `–${visit.expected_end_time.slice(0, 5)}`
            : ""
        }`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{visit.visit_type?.name ?? "—"}</Badge>
            <Badge variant={VISIT_STATUS_VARIANTS[visit.status]}>
              {VISIT_STATUS_LABELS[visit.status]}
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

      {cancelled && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            This visit is cancelled. It is kept for the record and can no
            longer be edited.
          </AlertDescription>
        </Alert>
      )}

      {editable ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visit details</CardTitle>
            </CardHeader>
            <CardContent>
              <VisitForm
                action={updateVisitAction}
                visit={visit}
                visitTypes={withCurrent(activeVisitTypes, visit.visit_type)}
                tripTypes={withCurrent(activeTripTypes, visit.trip_type)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cancel this visit</CardTitle>
              <CardDescription>
                Cancelling keeps the record and its history; it is not deleted.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end">
              <ConfirmAction
                action={cancelVisitAction}
                fields={{ id: visit.id }}
                trigger="Cancel visit"
                triggerVariant="destructive"
                title="Cancel this visit?"
                description={`The ${prettyDate} visit for ${visit.delegation_name} will be marked cancelled. This cannot be edited afterwards.`}
                confirmLabel="Cancel visit"
                withReason
                reasonRequired
                reasonLabel="Reason for cancellation (recorded in the audit trail)"
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit record</CardTitle>
            <CardDescription>
              {cancelled ? "Cancelled visit." : "Read-only for your role."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Delegation" value={visit.delegation_name} />
            <Detail label="Visit type" value={visit.visit_type?.name ?? "—"} />
            <Detail label="Trip type" value={visit.trip_type?.name ?? "—"} />
            <Detail
              label="Visitors"
              value={String(visit.number_of_visitors)}
            />
            <Detail label="Pickup" value={visit.pickup_location} />
            <Detail label="Destination" value={visit.destination} />
            <Detail label="Notes" value={visit.notes ?? "—"} full />
          </CardContent>
        </Card>
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
