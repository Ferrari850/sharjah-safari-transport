import type { Metadata } from "next";

import { requireCapability } from "@/lib/auth/session";
import { listLinkableDriverProfiles } from "@/lib/data/users";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { DriverForm } from "../driver-form";
import { createDriverAction } from "../actions";

export const metadata: Metadata = { title: "New driver" };

export default async function NewDriverPage() {
  await requireCapability("MANAGE_DRIVERS");
  const linkableProfiles = await listLinkableDriverProfiles();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New driver"
        description="Add a driver to the roster."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Driver details</CardTitle>
          <CardDescription>
            Only the licence class is recorded — never a licence number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriverForm
            action={createDriverAction}
            linkableProfiles={linkableProfiles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
