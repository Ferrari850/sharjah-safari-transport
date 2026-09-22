import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { getUser, countActiveAdmins } from "@/lib/data/users";
import { firstParam } from "@/lib/data/search";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/constants/roles";
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
import { RoleBadge } from "@/components/common/role-badge";
import { ConfirmAction } from "@/components/common/confirm-action";
import { SubmitButton } from "@/components/common/submit-button";
import { UserEditForm } from "../user-edit-form";
import { changeUserRoleAction, setUserActiveAction } from "../actions";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = { title: "User" };

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCapability("MANAGE_USERS");

  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();

  const error = firstParam((await searchParams).error);
  const activeAdmins = await countActiveAdmins();
  const isLastActiveAdmin =
    user.role === "ADMIN" && user.is_active && activeAdmins <= 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/users">
          <ArrowLeft className="size-4" />
          All users
        </Link>
      </Button>

      <PageHeader
        title={user.full_name || user.email}
        description={user.email}
        actions={
          <div className="flex items-center gap-2">
            <RoleBadge role={user.role} />
            <Badge variant={user.is_active ? "success" : "destructive"}>
              {user.is_active ? "Active" : "Inactive"}
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

      {isLastActiveAdmin && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            This is the only active administrator. The database will refuse to
            demote or deactivate them until another administrator exists.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee information</CardTitle>
        </CardHeader>
        <CardContent>
          <UserEditForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role</CardTitle>
          <CardDescription>
            Role changes are recorded in the audit trail with the previous and
            new value.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={changeUserRoleAction} className="space-y-4">
            <input type="hidden" name="id" value={user.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select id="role" name="role" defaultValue={user.role}>
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
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
                Change role
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account status</CardTitle>
          <CardDescription>
            A deactivated account is refused at sign-in. History is kept.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Created {new Date(user.created_at).toLocaleString("en-GB")}
          </p>
          {user.is_active ? (
            <ConfirmAction
              action={setUserActiveAction}
              fields={{ id: user.id, active: "false" }}
              trigger="Deactivate account"
              triggerVariant="destructive"
              title="Deactivate this account?"
              description={`${user.email} will be signed out at their next request and refused at sign-in. This can be undone.`}
              confirmLabel="Deactivate"
              withReason
            />
          ) : (
            <ConfirmAction
              action={setUserActiveAction}
              fields={{ id: user.id, active: "true" }}
              trigger="Reactivate account"
              triggerVariant="default"
              title="Reactivate this account?"
              description={`${user.email} will be able to sign in again with their existing password.`}
              confirmLabel="Reactivate"
              confirmVariant="default"
              withReason
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
