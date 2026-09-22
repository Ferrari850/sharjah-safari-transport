"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { createUserAction } from "./actions";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/constants/roles";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/common/submit-button";
import { FormMessage } from "@/components/common/form-message";
import type { ActionState } from "@/types";

const INITIAL: ActionState = {};

export function UserCreateForm() {
  const [state, formAction] = useActionState(createUserAction, INITIAL);
  const [mode, setMode] = useState<"invite" | "password">("invite");

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required autoComplete="off" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee_number">Employee number</Label>
          <Input id="employee_number" name="employee_number" autoComplete="off" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="off" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Mobile</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="off" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue="DRIVER" required>
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Least privilege: leave as Driver unless the person needs more.
          </p>
        </div>
      </div>

      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Activation</legend>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="radio"
            name="mode"
            value="invite"
            className="mt-1"
            checked={mode === "invite"}
            onChange={() => setMode("invite")}
          />
          <span>
            <span className="font-medium">Send an email invitation</span>
            <span className="block text-muted-foreground">
              The person sets their own password from a one-time link. No
              password is ever shared or stored by an administrator.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="radio"
            name="mode"
            value="password"
            className="mt-1"
            checked={mode === "password"}
            onChange={() => setMode("password")}
          />
          <span>
            <span className="font-medium">Set an initial password</span>
            <span className="block text-muted-foreground">
              Use only when email is unavailable. Ask the person to change it
              immediately.
            </span>
          </span>
        </label>

        {mode === "password" && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="password">Initial password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-muted-foreground">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>
        )}
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/users">Cancel</Link>
        </Button>
        <SubmitButton pendingLabel="Creating…">Create user</SubmitButton>
      </div>
    </form>
  );
}
