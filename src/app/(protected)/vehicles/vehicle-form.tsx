"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
} from "@/lib/constants/vocab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { FormMessage } from "@/components/common/form-message";
import type { ActionState, Lookup, VehicleWithType } from "@/types";

const INITIAL: ActionState = {};

export function VehicleForm({
  action,
  vehicle,
  vehicleTypes,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  vehicle?: VehicleWithType;
  /** Selectable types: active ones, plus whichever this record already uses. */
  vehicleTypes: Lookup[];
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  const editing = Boolean(vehicle);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vehicle_number">Vehicle number</Label>
          <Input
            id="vehicle_number"
            name="vehicle_number"
            defaultValue={vehicle?.vehicle_number ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plate_number">Plate number</Label>
          <Input
            id="plate_number"
            name="plate_number"
            defaultValue={vehicle?.plate_number ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicle_type_id">Type</Label>
          <Select
            id="vehicle_type_id"
            name="vehicle_type_id"
            defaultValue={vehicle?.vehicle_type_id ?? ""}
            required
          >
            <option value="" disabled>
              Choose a type…
            </option>
            {vehicleTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
                {type.active ? "" : " (retired)"}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity (seats)</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={200}
            defaultValue={vehicle?.capacity ?? 1}
            required
          />
        </div>

        {!editing && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue="AVAILABLE">
              {VEHICLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {VEHICLE_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={vehicle?.notes ?? ""}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={vehicle ? `/vehicles/${vehicle.id}` : "/vehicles"}>
            Cancel
          </Link>
        </Button>
        <SubmitButton pendingLabel="Saving…">
          {editing ? "Save changes" : "Create vehicle"}
        </SubmitButton>
      </div>
    </form>
  );
}
