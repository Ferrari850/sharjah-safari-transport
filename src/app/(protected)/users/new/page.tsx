import type { Metadata } from "next";

import { requireCapability } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { UserCreateForm } from "../user-create-form";

export const metadata: Metadata = { title: "New user" };

export default async function NewUserPage() {
  await requireCapability("MANAGE_USERS");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New user"
        description="Create a login and assign its role."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
          <CardDescription>
            The account is created server-side. Roles can be changed later, and
            every change is recorded in the audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserCreateForm />
        </CardContent>
      </Card>
    </div>
  );
}
