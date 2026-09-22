"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/auth/audit";
import {
  LOOKUP_LABELS,
  LOOKUP_TABLES,
  getLookup,
} from "@/lib/data/lookups";
import {
  describeDbError,
  enumOf,
  fail,
  str,
  succeed,
} from "@/lib/actions/helpers";
import type { ActionState, LookupTable } from "@/types";

const SETTINGS_PATH = "/settings/types";
const MAX_NAME_LENGTH = 60;

/** Which vocabulary a form is acting on — never trusted from the browser. */
function readTable(form: FormData): LookupTable | null {
  return enumOf(form, "table", LOOKUP_TABLES);
}

export async function createLookupAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireCapability("MANAGE_LOOKUPS");

  const table = readTable(form);
  if (!table) return fail("Unknown vocabulary.");

  const name = str(form, "name");
  if (name === "") return fail("Enter a name.");
  if (name.length > MAX_NAME_LENGTH) {
    return fail(`Keep the name under ${MAX_NAME_LENGTH} characters.`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .insert({ name, active: true })
    .select("id")
    .single();

  if (error || !data) {
    return fail(
      describeDbError(error, `Could not add the ${LOOKUP_LABELS[table].singular.toLowerCase()}.`),
    );
  }

  await recordAuditLog({
    action: "INSERT",
    entityType: table,
    entityId: data.id,
    description: `Added ${LOOKUP_LABELS[table].singular.toLowerCase()} "${name}"`,
    newValue: { name, active: true },
  });

  revalidatePath(SETTINGS_PATH);
  return succeed(`Added "${name}".`);
}

export async function renameLookupAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireCapability("MANAGE_LOOKUPS");

  const table = readTable(form);
  if (!table) return fail("Unknown vocabulary.");

  const id = str(form, "id");
  const name = str(form, "name");
  if (name === "") return fail("Enter a name.");
  if (name.length > MAX_NAME_LENGTH) {
    return fail(`Keep the name under ${MAX_NAME_LENGTH} characters.`);
  }

  const before = await getLookup(table, id);
  if (!before) return fail("That entry no longer exists.");
  if (before.name === name) return succeed("No changes to save.");

  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ name }).eq("id", id);
  if (error) return fail(describeDbError(error, "Could not rename it."));

  await recordAuditLog({
    action: "UPDATE",
    entityType: table,
    entityId: id,
    description: `Renamed ${LOOKUP_LABELS[table].singular.toLowerCase()} "${before.name}" to "${name}"`,
    oldValue: { name: before.name },
    newValue: { name },
  });

  revalidatePath(SETTINGS_PATH);
  return succeed(`Renamed to "${name}".`);
}

/**
 * Retire or restore a vocabulary entry.
 *
 * Retiring sets `active = false` rather than deleting: records that already
 * reference the entry keep reading correctly, and the foreign key is
 * ON DELETE RESTRICT so a real delete would fail anyway.
 */
export async function setLookupActiveAction(form: FormData): Promise<void> {
  await requireCapability("MANAGE_LOOKUPS");

  const table = readTable(form);
  const id = str(form, "id");
  const active = str(form, "active") === "true";
  if (!table || !id) return;

  const before = await getLookup(table, id);
  if (!before || before.active === active) return;

  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ active }).eq("id", id);
  if (error) return;

  await recordAuditLog({
    action: "STATUS_CHANGE",
    entityType: table,
    entityId: id,
    description: `${active ? "Restored" : "Retired"} ${LOOKUP_LABELS[table].singular.toLowerCase()} "${before.name}"`,
    oldValue: { active: before.active },
    newValue: { active },
  });

  revalidatePath(SETTINGS_PATH);
}
