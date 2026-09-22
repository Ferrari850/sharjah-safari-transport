import type { Metadata } from "next";

import { requireCapability } from "@/lib/auth/session";
import { isIsoDate } from "@/lib/data/visits";
import { listLookup } from "@/lib/data/lookups";
import { firstParam } from "@/lib/data/search";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { VisitForm } from "../visit-form";
import { createVisitAction } from "../actions";

export const metadata: Metadata = { title: "New visit" };

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCapability("MANAGE_VISITS");

  const [visitTypes, tripTypes] = await Promise.all([
    listLookup("visit_types", { activeOnly: true }),
    listLookup("trip_types", { activeOnly: true }),
  ]);

  const dateParam = firstParam((await searchParams).date);
  const defaultDate = isIsoDate(dateParam) ? dateParam : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New visit" description="Plan a visit or trip." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visit details</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitForm
            action={createVisitAction}
            defaultDate={defaultDate}
            visitTypes={visitTypes}
            tripTypes={tripTypes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
