"use client";

import { useActionState } from "react";

import { updateUserAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/common/submit-button";
import { FormMessage } from "@/components/common/form-message";
import type { ActionState, Profile } from "@/types";

const INITIAL: ActionState = {};

export function UserEditForm({ user }: { user: Profile }) {
  const [state, formAction] = useActionState(updateUserAction, INITIAL);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={user.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={user.full_name ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee_number">Employee number</Label>
          <Input
            id="employee_number"
            name="employee_number"
            defaultValue={user.employee_number ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Mobile</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-readonly">Email</Label>
          <Input id="email-readonly" value={user.email} readOnly disabled />
          <p className="text-xs text-muted-foreground">
            The email address is fixed at the database level and cannot be
            edited here.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}
