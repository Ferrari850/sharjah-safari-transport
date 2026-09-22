"use client";

import { useActionState } from "react";
import Link from "next/link";

import { VISIT_STATUSES, VISIT_STATUS_LABELS } from "@/lib/constants/vocab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { FormMessage } from "@/components/common/form-message";
import type { ActionState, Lookup, VisitWithTypes } from "@/types";

const INITIAL: ActionState = {};

/** Cancellation is its own confirmed action, so it is not offered here. */
const EDITABLE_STATUSES = VISIT_STATUSES.filter((s) => s !== "CANCELLED");

export function VisitForm({
  action,
  visit,
  defaultDate,
  visitTypes,
  tripTypes,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  visit?: VisitWithTypes;
  defaultDate?: string;
  /** Selectable types: active ones, plus whichever this record already uses. */
  visitTypes: Lookup[];
  tripTypes: Lookup[];
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  const editing = Boolean(visit);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />
      {visit && <input type="hidden" name="id" value={visit.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="delegation_name">Delegation name</Label>
          <Input
            id="delegation_name"
            name="delegation_name"
            defaultValue={visit?.delegation_name ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visit_date">Visit date</Label>
          <Input
            id="visit_date"
            name="visit_date"
            type="date"
            defaultValue={visit?.visit_date ?? defaultDate ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="number_of_visitors">Number of visitors</Label>
          <Input
            id="number_of_visitors"
            name="number_of_visitors"
            type="number"
            min={1}
            max={10000}
            defaultValue={visit?.number_of_visitors ?? 1}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_time">Start time</Label>
          <Input
            id="start_time"
            name="start_time"
            type="time"
            defaultValue={visit?.start_time?.slice(0, 5) ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected_end_time">Expected end time</Label>
          <Input
            id="expected_end_time"
            name="expected_end_time"
            type="time"
            defaultValue={visit?.expected_end_time?.slice(0, 5) ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visit_type_id">Visit type</Label>
          <Select
            id="visit_type_id"
            name="visit_type_id"
            defaultValue={visit?.visit_type_id ?? ""}
            required
          >
            <option value="" disabled>
              Choose a type…
            </option>
            {visitTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
                {type.active ? "" : " (retired)"}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trip_type_id">Trip type</Label>
          <Select
            id="trip_type_id"
            name="trip_type_id"
            defaultValue={visit?.trip_type_id ?? ""}
            required
          >
            <option value="" disabled>
              Choose a type…
            </option>
            {tripTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
                {type.active ? "" : " (retired)"}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pickup_location">Pickup location</Label>
          <Input
            id="pickup_location"
            name="pickup_location"
            defaultValue={visit?.pickup_location ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination">Destination</Label>
          <Input
            id="destination"
            name="destination"
            defaultValue={visit?.destination ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            name="status"
            defaultValue={visit?.status ?? "DRAFT"}
          >
            {EDITABLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {VISIT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={visit?.notes ?? ""}
          />
        </div>
      </div>

      <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
        Drivers and vehicles are assigned in a later phase. This records the
        plan only.
      </p>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={visit ? `/visits/${visit.id}` : "/visits"}>Cancel</Link>
        </Button>
        <SubmitButton pendingLabel="Saving…">
          {editing ? "Save changes" : "Create visit"}
        </SubmitButton>
      </div>
    </form>
  );
}
