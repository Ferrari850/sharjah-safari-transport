import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarRange, Plus } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { listVisits } from "@/lib/data/visits";
import { enumParam, firstParam } from "@/lib/data/search";
import { isIsoDate } from "@/lib/data/visits";
import { can } from "@/lib/constants/roles";
import {
  TRIP_TYPE_LABELS,
  VISIT_STATUSES,
  VISIT_STATUS_LABELS,
  VISIT_STATUS_VARIANTS,
  VISIT_TYPES,
  VISIT_TYPE_LABELS,
  VISIT_TYPE_VARIANTS,
} from "@/lib/constants/vocab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const metadata: Metadata = { title: "Visits" };

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCapability("VIEW_VISITS");
  const canManage = can(profile.role, "MANAGE_VISITS");

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = enumParam(params.status, VISIT_STATUSES);
  const type = enumParam(params.type, VISIT_TYPES);
  const fromRaw = firstParam(params.from);
  const toRaw = firstParam(params.to);
  const from = isIsoDate(fromRaw) ? fromRaw : "";
  const to = isIsoDate(toRaw) ? toRaw : "";

  const visits = await listVisits({ q, status, type, from, to });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Visits & trips"
        description={
          canManage
            ? "Planned visits. Drivers and vehicles are assigned in a later phase."
            : "Planned visits. Read-only for your role."
        }
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/visits/calendar">
                <CalendarRange className="size-4" />
                Calendar
              </Link>
            </Button>
            {canManage && (
              <Button asChild>
                <Link href="/visits/new">
                  <Plus className="size-4" />
                  New visit
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-3">
        <FilterBar
          action="/visits"
          query={q}
          queryPlaceholder="Delegation, pickup, destination"
          hidden={{ from, to }}
          selects={[
            {
              name: "status",
              label: "statuses",
              value: status,
              options: VISIT_STATUSES.map((s) => ({
                value: s,
                label: VISIT_STATUS_LABELS[s],
              })),
            },
            {
              name: "type",
              label: "types",
              value: type,
              options: VISIT_TYPES.map((t) => ({
                value: t,
                label: VISIT_TYPE_LABELS[t],
              })),
            },
          ]}
        />

        <form
          method="get"
          action="/visits"
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="q" value={q} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="type" value={type} />
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">
              From date
            </Label>
            <Input id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">
              To date
            </Label>
            <Input id="to" name="to" type="date" defaultValue={to} />
          </div>
          <Button type="submit" variant="secondary">
            Apply dates
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          {visits.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No visits match"
              description="Adjust the search, filters or date range, or schedule the first visit."
              action={
                canManage ? (
                  <Button asChild variant="outline">
                    <Link href="/visits/new">Schedule a visit</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Delegation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Visitors</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      <Link
                        href={`/visits/${visit.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {new Date(`${visit.visit_date}T00:00:00`).toLocaleDateString(
                          "en-GB",
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {visit.start_time.slice(0, 5)}
                      {visit.expected_end_time
                        ? `–${visit.expected_end_time.slice(0, 5)}`
                        : ""}
                    </TableCell>
                    <TableCell>{visit.delegation_name}</TableCell>
                    <TableCell>
                      <Badge variant={VISIT_TYPE_VARIANTS[visit.visit_type]}>
                        {VISIT_TYPE_LABELS[visit.visit_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {TRIP_TYPE_LABELS[visit.trip_type]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {visit.number_of_visitors}
                    </TableCell>
                    <TableCell>
                      <Badge variant={VISIT_STATUS_VARIANTS[visit.status]}>
                        {VISIT_STATUS_LABELS[visit.status]}
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
        Showing {visits.length} visit{visits.length === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
