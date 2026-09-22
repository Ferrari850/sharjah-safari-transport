import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, List, Plus } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { listVisitsInRange } from "@/lib/data/visits";
import { firstParam } from "@/lib/data/search";
import { can } from "@/lib/constants/roles";
import {
  VISIT_STATUS_LABELS,
  VISIT_TYPE_LABELS,
  VISIT_TYPE_VARIANTS,
} from "@/lib/constants/vocab";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import type { Visit } from "@/types";

export const metadata: Metadata = { title: "Visit calendar" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function VisitCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireCapability("VIEW_VISITS");
  const canManage = can(profile.role, "MANAGE_VISITS");

  const monthParam = firstParam((await searchParams).month);
  const { year, month } = parseMonth(monthParam);

  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  const fromIso = iso(first);
  const toIso = iso(last);

  const visits = await listVisitsInRange(fromIso, toIso);
  const byDate = new Map<string, Visit[]>();
  for (const visit of visits) {
    const bucket = byDate.get(visit.visit_date) ?? [];
    bucket.push(visit);
    byDate.set(visit.visit_date, bucket);
  }

  // Monday-first grid offset.
  const leading = (first.getUTCDay() + 6) % 7;
  const daysInMonth = last.getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      iso(new Date(Date.UTC(year, month, i + 1))),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = first.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const todayIso = iso(new Date());

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Visit calendar"
        description={`${visits.length} visit${visits.length === 1 ? "" : "s"} in ${monthLabel}.`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/visits">
                <List className="size-4" />
                List
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

      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/visits/calendar?month=${shift(year, month, -1)}`}>
            <ChevronLeft className="size-4" />
            Previous
          </Link>
        </Button>
        <p className="text-sm font-medium">{monthLabel}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/visits/calendar?month=${shift(year, month, 1)}`}>
            Next
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {cells.map((dateIso, index) => {
              if (!dateIso) {
                return (
                  <div
                    key={`pad-${index}`}
                    className="min-h-20 rounded-md bg-muted/30 sm:min-h-28"
                  />
                );
              }

              const dayVisits = byDate.get(dateIso) ?? [];
              const dayNumber = Number(dateIso.slice(8, 10));

              return (
                <div
                  key={dateIso}
                  className={cn(
                    "min-h-20 rounded-md border p-1 sm:min-h-28 sm:p-2",
                    dateIso === todayIso && "border-primary",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        dateIso === todayIso && "text-primary",
                      )}
                    >
                      {dayNumber}
                    </span>
                    {canManage && (
                      <Link
                        href={`/visits/new?date=${dateIso}`}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Add a visit on ${dateIso}`}
                      >
                        <Plus className="size-3" />
                      </Link>
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    {dayVisits.slice(0, 3).map((visit) => (
                      <Link
                        key={visit.id}
                        href={`/visits/${visit.id}`}
                        className="block"
                        title={`${visit.delegation_name} — ${VISIT_STATUS_LABELS[visit.status]}`}
                      >
                        <Badge
                          variant={VISIT_TYPE_VARIANTS[visit.visit_type]}
                          className={cn(
                            "w-full justify-start truncate text-[10px]",
                            visit.status === "CANCELLED" && "line-through opacity-60",
                          )}
                        >
                          {visit.start_time.slice(0, 5)} {visit.delegation_name}
                        </Badge>
                      </Link>
                    ))}
                    {dayVisits.length > 3 && (
                      <Link
                        href={`/visits?from=${dateIso}&to=${dateIso}`}
                        className="block px-1 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                      >
                        +{dayVisits.length - 3} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Visit types:</span>
        {Object.entries(VISIT_TYPE_LABELS).map(([value, label]) => (
          <Badge
            key={value}
            variant={VISIT_TYPE_VARIANTS[value as keyof typeof VISIT_TYPE_VARIANTS]}
            className="text-[10px]"
          >
            {label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/** `YYYY-MM` from the query string, falling back to the current month. */
function parseMonth(value: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11 && year >= 2000 && year <= 2100) {
      return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

function shift(year: number, month: number, by: number): string {
  const d = new Date(Date.UTC(year, month + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
