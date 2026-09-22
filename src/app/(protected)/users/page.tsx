import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users as UsersIcon } from "lucide-react";

import { requireCapability } from "@/lib/auth/session";
import { listUsers } from "@/lib/data/users";
import { enumParam, firstParam } from "@/lib/data/search";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/constants/roles";
import { Button } from "@/components/ui/button";
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
import { RoleBadge } from "@/components/common/role-badge";

export const metadata: Metadata = { title: "Users" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireCapability("MANAGE_USERS");

  const params = await searchParams;
  const q = firstParam(params.q);
  const role = enumParam(params.role, ALL_ROLES);
  const active = enumParam(params.active, ["active", "inactive"] as const);

  const users = await listUsers({ q, role, active });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Users"
        description="Logins, roles and account status. Administrators only."
        actions={
          <Button asChild>
            <Link href="/users/new">
              <Plus className="size-4" />
              New user
            </Link>
          </Button>
        }
      />

      <FilterBar
        action="/users"
        query={q}
        queryPlaceholder="Name, email, employee no., mobile"
        selects={[
          {
            name: "role",
            label: "roles",
            value: role,
            options: ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
          },
          {
            name: "active",
            label: "statuses",
            value: active,
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No users match"
              description="Adjust the search or filters, or create the first user account."
              action={
                <Button asChild variant="outline">
                  <Link href="/users/new">Create a user</Link>
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee no.</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/users/${user.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {user.full_name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.employee_number || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.phone || "—"}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "success" : "destructive"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {users.length} user{users.length === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
