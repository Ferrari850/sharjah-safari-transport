import type { Metadata } from "next";
import { ScrollText, ShieldCheck } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { listAuditLogs, AUDIT_PAGE_SIZE } from "@/lib/data/audit";
import { enumParam, firstParam } from "@/lib/data/search";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_VARIANTS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/constants/vocab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

export const metadata: Metadata = { title: "Audit logs" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCapability("VIEW_AUDIT_LOGS");

  const params = await searchParams;
  const q = firstParam(params.q);
  const action = enumParam(params.action, AUDIT_ACTIONS);
  const entity = enumParam(params.entity, AUDIT_ENTITY_TYPES);

  const logs = await listAuditLogs({ q, action, entity });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Audit logs"
        description="Every privileged change, in the order it happened."
      />

      <Alert>
        <ShieldCheck className="size-4" />
        <AlertDescription>
          This trail is append-only. Entries cannot be edited or deleted by
          anyone — including administrators and the service role — because the
          database refuses the operation outright.
        </AlertDescription>
      </Alert>

      <FilterBar
        action="/audit"
        query={q}
        queryPlaceholder="Actor, description or entity"
        selects={[
          {
            name: "action",
            label: "actions",
            value: action,
            options: AUDIT_ACTIONS.map((a) => ({
              value: a,
              label: AUDIT_ACTION_LABELS[a],
            })),
          },
          {
            name: "entity",
            label: "entities",
            value: entity,
            options: AUDIT_ENTITY_TYPES.map((e) => ({ value: e, label: e })),
          },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No audit entries match"
              description="Adjust the search or filters. Entries appear here as soon as a privileged change is made."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("en-GB")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.actor_email ?? "system"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={AUDIT_ACTION_VARIANTS[log.action]}>
                        {AUDIT_ACTION_LABELS[log.action]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.entity_type}
                    </TableCell>
                    <TableCell className="max-w-72">
                      <p>{log.description ?? "—"}</p>
                      {log.reason && (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">
                          Reason: {log.reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-64 text-xs text-muted-foreground">
                      <ChangeSummary
                        oldValue={log.old_value}
                        newValue={log.new_value}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing the {logs.length} most recent
        {logs.length === AUDIT_PAGE_SIZE ? ` (capped at ${AUDIT_PAGE_SIZE})` : ""}.
      </p>
    </div>
  );
}

/** Renders the before → after pairs an audit row captured, if any. */
function ChangeSummary({
  oldValue,
  newValue,
}: {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}) {
  if (!newValue && !oldValue) return <span>—</span>;

  const keys = Array.from(
    new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]),
  ).slice(0, 4);

  if (keys.length === 0) return <span>—</span>;

  return (
    <ul className="space-y-0.5">
      {keys.map((key) => (
        <li key={key} className="truncate">
          <span className="font-medium">{key}</span>:{" "}
          {oldValue && key in oldValue ? (
            <>
              <span className="line-through">{format(oldValue[key])}</span>{" "}
            </>
          ) : null}
          <span>{format(newValue?.[key])}</span>
        </li>
      ))}
    </ul>
  );
}

function format(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
