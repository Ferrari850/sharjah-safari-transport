import type { Metadata } from "next";

import { requireCapability } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { VehicleForm } from "../vehicle-form";
import { createVehicleAction } from "../actions";

export const metadata: Metadata = { title: "New vehicle" };

export default async function NewVehiclePage() {
  await requireCapability("MANAGE_VEHICLES");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New vehicle" description="Add a vehicle to the fleet." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle details</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm action={createVehicleAction} />
        </CardContent>
      </Card>
    </div>
  );
}
