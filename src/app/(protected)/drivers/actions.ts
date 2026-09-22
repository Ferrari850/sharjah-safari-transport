"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog, diffValues } from "@/lib/auth/audit";
import {
  DRIVER_STATUSES,
  DRIVER_STATUS_LABELS,
  LICENSE_TYPES,
  LICENSE_TYPE_LABELS,
} from "@/lib/constants/vocab";
import {
  describeDbError,
  enumOf,
  fail,
  nullableDate,
  nullableStr,
  str,
  succeed,
} from "@/lib/actions/helpers";
import { getDriver } from "@/lib/data/drivers";
import type { ActionState } from "@/types";

const DRIVERS_PATH = "/drivers";

export async function createDriverAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireCapability("MANAGE_DRIVERS");

  const employeeId = str(form, "employee_id");
  const fullName = str(form, "full_name");
  const licenseType = enumOf(form, "license_type", LICENSE_TYPES);
  const status = enumOf(form, "status", DRIVER_STATUSES);

  const licenseExpiry = nullableDate(form, "license_expiry");

  if (employeeId === "") return fail("Employee number is required.");
  if (fullName === "") return fail("Full name is required.");
  if (!licenseType) return fail("Choose a licence type.");
  if (!status) return fail("Choose a status.");
  if (licenseExpiry === undefined) return fail("Enter a valid licence expiry date.");

  const record = {
    employee_id: employeeId,
    full_name: fullName,
    phone: nullableStr(form, "phone"),
    license_type: licenseType,
    license_expiry: licenseExpiry,
    status,
    notes: nullableStr(form, "notes"),
    profile_id: nullableStr(form, "profile_id"),
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drivers")
    .insert(record)
    .select("id")
    .single();

  if (error || !data) {
    return fail(describeDbError(error, "Could not create the driver."));
  }

  await recordAuditLog({
    action: "INSERT",
    entityType: "drivers",
    entityId: data.id,
    description: `Created driver ${fullName} (${employeeId})`,
    newValue: record,
  });

  revalidatePath(DRIVERS_PATH);
  redirect(`${DRIVERS_PATH}/${data.id}`);
}

export async function updateDriverAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireCapability("MANAGE_DRIVERS");

  const id = str(form, "id");
  if (!id) return fail("Missing driver.");

  const before = await getDriver(id);
  if (!before) return fail("That driver no longer exists.");

  const licenseType = enumOf(form, "license_type", LICENSE_TYPES);
  if (!licenseType) return fail("Choose a licence type.");

  const licenseExpiry = nullableDate(form, "license_expiry");
  if (licenseExpiry === undefined) {
    return fail("Enter a valid licence expiry date.");
  }

  const patch = {
    employee_id: str(form, "employee_id"),
    full_name: str(form, "full_name"),
    phone: nullableStr(form, "phone"),
    license_type: licenseType,
    license_expiry: licenseExpiry,
    notes: nullableStr(form, "notes"),
    profile_id: nullableStr(form, "profile_id"),
  };

  if (patch.employee_id === "") return fail("Employee number is required.");
  if (patch.full_name === "") return fail("Full name is required.");

  const { oldValue, newValue, changed } = diffValues(before, patch);
  if (changed.length === 0) return succeed("No changes to save.");

  const supabase = await createClient();
  const { error } = await supabase.from("drivers").update(patch).eq("id", id);
  if (error) return fail(describeDbError(error, "Could not save the driver."));

  // A licence-type change is operationally significant, so it is described
  // explicitly rather than folded into a generic field list.
  const licenceChanged =
    changed.includes("license_type") || changed.includes("license_expiry");
  await recordAuditLog({
    action: "UPDATE",
    entityType: "drivers",
    entityId: id,
    description: changed.includes("license_type")
      ? `Licence type changed from ${LICENSE_TYPE_LABELS[before.license_type]} to ${LICENSE_TYPE_LABELS[licenseType]} for ${before.full_name}`
      : licenceChanged
        ? `Licence expiry changed from ${before.license_expiry ?? "none"} to ${licenseExpiry ?? "none"} for ${before.full_name}`
        : `Updated ${changed.join(", ")} for ${before.full_name}`,
    oldValue,
    newValue,
  });

  revalidatePath(DRIVERS_PATH);
  revalidatePath(`${DRIVERS_PATH}/${id}`);
  return succeed("Driver saved.");
}

export async function changeDriverStatusAction(form: FormData): Promise<void> {
  await requireCapability("MANAGE_DRIVERS");

  const id = str(form, "id");
  const status = enumOf(form, "status", DRIVER_STATUSES);
  const reason = nullableStr(form, "reason");

  const before = id ? await getDriver(id) : null;
  if (!before || !status) redirect(DRIVERS_PATH);
  if (before.status === status) redirect(`${DRIVERS_PATH}/${id}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("drivers")
    .update({ status })
    .eq("id", id);

  if (error) {
    redirect(
      `${DRIVERS_PATH}/${id}?error=${encodeURIComponent(
        describeDbError(error, "Could not change the status."),
      )}`,
    );
  }

  await recordAuditLog({
    action: "STATUS_CHANGE",
    entityType: "drivers",
    entityId: id,
    description:
      status === "INACTIVE"
        ? `Deactivated driver ${before.full_name}`
        : `Status changed from ${DRIVER_STATUS_LABELS[before.status]} to ${DRIVER_STATUS_LABELS[status]} for ${before.full_name}`,
    oldValue: { status: before.status },
    newValue: { status },
    reason,
  });

  revalidatePath(DRIVERS_PATH);
  revalidatePath(`${DRIVERS_PATH}/${id}`);
  redirect(`${DRIVERS_PATH}/${id}`);
}
