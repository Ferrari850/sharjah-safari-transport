"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog, diffValues } from "@/lib/auth/audit";
import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
} from "@/lib/constants/vocab";
import { isSelectableLookup } from "@/lib/data/lookups";
import {
  describeDbError,
  enumOf,
  fail,
  intOf,
  nullableStr,
  str,
  succeed,
} from "@/lib/actions/helpers";
import { getVehicle } from "@/lib/data/vehicles";
import type { ActionState } from "@/types";

const VEHICLES_PATH = "/vehicles";
const MAX_CAPACITY = 200;

export async function createVehicleAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireCapability("MANAGE_VEHICLES");

  const vehicleNumber = str(form, "vehicle_number");
  const plateNumber = str(form, "plate_number");
  const vehicleTypeId = str(form, "vehicle_type_id");
  const status = enumOf(form, "status", VEHICLE_STATUSES);
  const capacity = intOf(form, "capacity");

  if (vehicleNumber === "") return fail("Vehicle number is required.");
  if (plateNumber === "") return fail("Plate number is required.");
  if (!status) return fail("Choose a status.");
  if (capacity === null || capacity < 1 || capacity > MAX_CAPACITY) {
    return fail(`Capacity must be between 1 and ${MAX_CAPACITY}.`);
  }
  // The vocabulary lives in a table, so the value is checked against it
  // rather than against a hard-coded list — and a retired type is refused.
  if (!(await isSelectableLookup("vehicle_types", vehicleTypeId))) {
    return fail("Choose a vehicle type.");
  }

  const record = {
    vehicle_number: vehicleNumber,
    plate_number: plateNumber,
    vehicle_type_id: vehicleTypeId,
    capacity,
    status,
    notes: nullableStr(form, "notes"),
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert(record)
    .select("id")
    .single();

  if (error || !data) {
    return fail(describeDbError(error, "Could not create the vehicle."));
  }

  await recordAuditLog({
    action: "INSERT",
    entityType: "vehicles",
    entityId: data.id,
    description: `Created vehicle ${vehicleNumber} (${plateNumber})`,
    newValue: record,
  });

  revalidatePath(VEHICLES_PATH);
  redirect(`${VEHICLES_PATH}/${data.id}`);
}

export async function updateVehicleAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireCapability("MANAGE_VEHICLES");

  const id = str(form, "id");
  if (!id) return fail("Missing vehicle.");

  const before = await getVehicle(id);
  if (!before) return fail("That vehicle no longer exists.");

  const vehicleTypeId = str(form, "vehicle_type_id");
  const capacity = intOf(form, "capacity");

  if (capacity === null || capacity < 1 || capacity > MAX_CAPACITY) {
    return fail(`Capacity must be between 1 and ${MAX_CAPACITY}.`);
  }
  // `before.vehicle_type_id` is allowed even if that type has since been
  // retired, so editing an unrelated field does not force a re-categorisation.
  if (
    !(await isSelectableLookup(
      "vehicle_types",
      vehicleTypeId,
      before.vehicle_type_id,
    ))
  ) {
    return fail("Choose a vehicle type.");
  }

  const patch = {
    vehicle_number: str(form, "vehicle_number"),
    plate_number: str(form, "plate_number"),
    vehicle_type_id: vehicleTypeId,
    capacity,
    notes: nullableStr(form, "notes"),
  };

  if (patch.vehicle_number === "") return fail("Vehicle number is required.");
  if (patch.plate_number === "") return fail("Plate number is required.");

  const { oldValue, newValue, changed } = diffValues(before, patch);
  if (changed.length === 0) return succeed("No changes to save.");

  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update(patch).eq("id", id);
  if (error) return fail(describeDbError(error, "Could not save the vehicle."));

  await recordAuditLog({
    action: "UPDATE",
    entityType: "vehicles",
    entityId: id,
    description: `Updated ${changed.join(", ")} for vehicle ${before.vehicle_number}`,
    oldValue,
    newValue,
  });

  revalidatePath(VEHICLES_PATH);
  revalidatePath(`${VEHICLES_PATH}/${id}`);
  return succeed("Vehicle saved.");
}

export async function changeVehicleStatusAction(
  form: FormData,
): Promise<void> {
  await requireCapability("MANAGE_VEHICLES");

  const id = str(form, "id");
  const status = enumOf(form, "status", VEHICLE_STATUSES);
  const reason = nullableStr(form, "reason");

  const before = id ? await getVehicle(id) : null;
  if (!before || !status) redirect(VEHICLES_PATH);
  if (before.status === status) redirect(`${VEHICLES_PATH}/${id}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({ status })
    .eq("id", id);

  if (error) {
    redirect(
      `${VEHICLES_PATH}/${id}?error=${encodeURIComponent(
        describeDbError(error, "Could not change the status."),
      )}`,
    );
  }

  await recordAuditLog({
    action: "STATUS_CHANGE",
    entityType: "vehicles",
    entityId: id,
    description:
      status === "INACTIVE"
        ? `Deactivated vehicle ${before.vehicle_number}`
        : `Status changed from ${VEHICLE_STATUS_LABELS[before.status]} to ${VEHICLE_STATUS_LABELS[status]} for vehicle ${before.vehicle_number}`,
    oldValue: { status: before.status },
    newValue: { status },
    reason,
  });

  revalidatePath(VEHICLES_PATH);
  revalidatePath(`${VEHICLES_PATH}/${id}`);
  redirect(`${VEHICLES_PATH}/${id}`);
}
