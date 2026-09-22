"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  DRIVER_STATUSES,
  DRIVER_STATUS_LABELS,
  LICENSE_TYPES,
  LICENSE_TYPE_LABELS,
} from "@/lib/constants/vocab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { FormMessage } from "@/components/common/form-message";
import type { ActionState, DriverWithProfile, Profile } from "@/types";

const INITIAL: ActionState = {};

type Action = (
  prev: ActionState,
  form: FormData,
) => Promise<ActionState>;

export function DriverForm({
  action,
  driver,
  linkableProfiles,
}: {
  action: Action;
  driver?: DriverWithProfile;
  linkableProfiles: Profile[];
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  const editing = Boolean(driver);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />
      {driver && <input type="hidden" name="id" value={driver.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={driver?.full_name ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee_id">Employee number</Label>
          <Input
            id="employee_id"
            name="employee_id"
            defaultValue={driver?.employee_id ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Mobile</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={driver?.phone ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="license_type">Licence type</Label>
          <Select
            id="license_type"
            name="license_type"
            defaultValue={driver?.license_type ?? "LIGHT"}
          >
            {LICENSE_TYPES.map((type) => (
              <option key={type} value={type}>
                {LICENSE_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>

        {!editing && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue="AVAILABLE">
              {DRIVER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {DRIVER_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="profile_id">Linked login</Label>
          <Select
            id="profile_id"
            name="profile_id"
            defaultValue={driver?.profile_id ?? ""}
          >
            <option value="">Not linked</option>
            {linkableProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name || profile.email}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Linking lets the driver see their own record. Optional — a driver
            can exist without a login.
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} defaultValue={driver?.notes ?? ""} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={driver ? `/drivers/${driver.id}` : "/drivers"}>Cancel</Link>
        </Button>
        <SubmitButton pendingLabel="Saving…">
          {editing ? "Save changes" : "Create driver"}
        </SubmitButton>
      </div>
    </form>
  );
}
