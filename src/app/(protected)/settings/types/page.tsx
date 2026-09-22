import type { Metadata } from "next";
import { Tags } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { listAllLookups, LOOKUP_LABELS, LOOKUP_TABLES } from "@/lib/data/lookups";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmAction } from "@/components/common/confirm-action";
import { AddLookupForm, RenameLookupForm } from "./lookup-manager";
import { setLookupActiveAction } from "./actions";

export const metadata: Metadata = { title: "Types" };

export default async function TypesSettingsPage() {
  await requireCapability("MANAGE_LOOKUPS");
  const lookups = await listAllLookups();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Types"
        description="The editable vocabularies used by vehicles and visits."
      />

      <Alert>
        <Tags className="size-4" />
        <AlertDescription>
          These lists live in the database, not in code — add or retire an
          entry here and it takes effect immediately, with no migration and no
          deployment. Retiring keeps existing records readable; it only stops
          the entry being chosen for new ones.
        </AlertDescription>
      </Alert>

      {LOOKUP_TABLES.map((table) => {
        const entries = lookups[table];
        const labels = LOOKUP_LABELS[table];

        return (
          <Card key={table}>
            <CardHeader>
              <CardTitle className="text-base">{labels.plural}</CardTitle>
              <CardDescription>
                Used by {table === "vehicle_types" ? "the fleet register" : "visit planning"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddLookupForm table={table} singular={labels.singular} />

              {entries.length === 0 ? (
                <EmptyState
                  icon={Tags}
                  title={`No ${labels.plural.toLowerCase()} yet`}
                  description="Add the first entry above."
                />
              ) : (
                <ul className="divide-y rounded-md border">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center gap-3 p-3"
                    >
                      <RenameLookupForm table={table} entry={entry} />

                      <Badge variant={entry.active ? "success" : "outline"}>
                        {entry.active ? "Active" : "Retired"}
                      </Badge>

                      {entry.active ? (
                        <ConfirmAction
                          action={setLookupActiveAction}
                          fields={{ table, id: entry.id, active: "false" }}
                          trigger="Retire"
                          triggerVariant="outline"
                          triggerSize="sm"
                          title={`Retire "${entry.name}"?`}
                          description="It will no longer be selectable for new records. Anything already using it keeps working and keeps displaying this name."
                          confirmLabel="Retire"
                        />
                      ) : (
                        <ConfirmAction
                          action={setLookupActiveAction}
                          fields={{ table, id: entry.id, active: "true" }}
                          trigger="Restore"
                          triggerVariant="outline"
                          triggerSize="sm"
                          title={`Restore "${entry.name}"?`}
                          description="It becomes selectable again for new records."
                          confirmLabel="Restore"
                          confirmVariant="default"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
