"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { createLookupAction, renameLookupAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/common/submit-button";
import { FormMessage } from "@/components/common/form-message";
import type { ActionState, Lookup, LookupTable } from "@/types";

const INITIAL: ActionState = {};

export function AddLookupForm({
  table,
  singular,
}: {
  table: LookupTable;
  singular: string;
}) {
  const [state, formAction] = useActionState(createLookupAction, INITIAL);

  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="table" value={table} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor={`new-${table}`}>Add a {singular.toLowerCase()}</Label>
          <Input
            id={`new-${table}`}
            name="name"
            placeholder={`e.g. ${singular}`}
            required
            maxLength={60}
          />
        </div>
        <SubmitButton pendingLabel="Adding…">
          <Plus className="size-4" />
          Add
        </SubmitButton>
      </div>
    </form>
  );
}

export function RenameLookupForm({
  table,
  entry,
}: {
  table: LookupTable;
  entry: Lookup;
}) {
  const [state, formAction] = useActionState(renameLookupAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-1 items-center gap-2">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={entry.id} />
      <label htmlFor={`name-${entry.id}`} className="sr-only">
        Name
      </label>
      <Input
        id={`name-${entry.id}`}
        name="name"
        defaultValue={entry.name}
        maxLength={60}
        className="h-9 max-w-64"
      />
      <SubmitButton variant="ghost" size="sm" pendingLabel="Saving…">
        Save
      </SubmitButton>
      {state.error && (
        <span className="text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}
