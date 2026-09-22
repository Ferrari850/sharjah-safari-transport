"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog, diffValues } from "@/lib/auth/audit";
import {
  TRIP_TYPES,
  VISIT_STATUSES,
  VISIT_TYPES,
} from "@/lib/constants/vocab";
import {
  describeDbError,
  enumOf,
  fail,
  intOf,
  nullableStr,
  str,
  succeed,
} from "@/lib/actions/helpers";
import { getVisit, isIsoDate } from "@/lib/data/visits";
import type { ActionState } from "@/types";

const VISITS_PATH = "/visits";
const MAX_VISITORS = 10000;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type VisitFields = {
  visit_date: string;
  start_time: string;
  expected_end_time: string | null;
  delegation_name: string;
  visit_type: (typeof VISIT_TYPES)[number];
  trip_type: (typeof TRIP_TYPES)[number];
  number_of_visitors: number;
  pickup_location: string;
  destination: string;
  notes: string | null;
  status: (typeof VISIT_STATUSES)[number];
};

/** Shared validation for create and edit. */
function readVisitFields(form: FormData): VisitFields | string {
  const visitDate = str(form, "visit_date");
  const startTime = str(form, "start_time");
  const endTime = nullableStr(form, "expected_end_time");
  const delegation = str(form, "delegation_name");
  const visitType = enumOf(form, "visit_type", VISIT_TYPES);
  const tripType = enumOf(form, "trip_type", TRIP_TYPES);
  const status = enumOf(form, "status", VISIT_STATUSES);
  const visitors = intOf(form, "number_of_visitors");
  const pickup = str(form, "pickup_location");
  const destination = str(form, "destination");

  if (!isIsoDate(visitDate)) return "Enter a valid visit date.";
  if (!TIME_RE.test(startTime)) return "Enter a valid start time.";
  if (endTime !== null && !TIME_RE.test(endTime)) {
    return "Enter a valid expected end time.";
  }
  if (endTime !== null && endTime <= startTime) {
    return "The expected end time must be after the start time.";
  }
  if (delegation === "") return "Delegation name is required.";
  if (!visitType) return "Choose a visit type.";
  if (!tripType) return "Choose a trip type.";
  if (!status) return "Choose a status.";
  if (visitors === null || visitors < 1 || visitors > MAX_VISITORS) {
    return `Number of visitors must be between 1 and ${MAX_VISITORS}.`;
  }
  if (pickup === "") return "Pickup location is required.";
  if (destination === "") return "Destination is required.";

  return {
    visit_date: visitDate,
    start_time: startTime,
    expected_end_time: endTime,
    delegation_name: delegation,
    visit_type: visitType,
    trip_type: tripType,
    number_of_visitors: visitors,
    pickup_location: pickup,
    destination,
    notes: nullableStr(form, "notes"),
    status,
  };
}

export async function createVisitAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const profile = await requireCapability("MANAGE_VISITS");

  const fields = readVisitFields(form);
  if (typeof fields === "string") return fail(fields);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .insert({ ...fields, created_by: profile.id })
    .select("id")
    .single();

  if (error || !data) {
    return fail(describeDbError(error, "Could not create the visit."));
  }

  await recordAuditLog({
    action: "INSERT",
    entityType: "visits",
    entityId: data.id,
    description: `Created ${fields.visit_type} visit for ${fields.delegation_name} on ${fields.visit_date}`,
    newValue: { ...fields },
  });

  revalidatePath(VISITS_PATH);
  redirect(`${VISITS_PATH}/${data.id}`);
}

export async function updateVisitAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireCapability("MANAGE_VISITS");

  const id = str(form, "id");
  if (!id) return fail("Missing visit.");

  const before = await getVisit(id);
  if (!before) return fail("That visit no longer exists.");
  if (before.status === "CANCELLED") {
    return fail("A cancelled visit cannot be edited.");
  }

  const fields = readVisitFields(form);
  if (typeof fields === "string") return fail(fields);

  const { oldValue, newValue, changed } = diffValues(before, fields);
  if (changed.length === 0) return succeed("No changes to save.");

  const supabase = await createClient();
  const { error } = await supabase.from("visits").update(fields).eq("id", id);
  if (error) return fail(describeDbError(error, "Could not save the visit."));

  await recordAuditLog({
    action: changed.includes("status") && changed.length === 1
      ? "STATUS_CHANGE"
      : "UPDATE",
    entityType: "visits",
    entityId: id,
    description: `Updated ${changed.join(", ")} for ${before.delegation_name}`,
    oldValue,
    newValue,
  });

  revalidatePath(VISITS_PATH);
  revalidatePath(`${VISITS_PATH}/${id}`);
  return succeed("Visit saved.");
}

/**
 * Cancel a visit. Cancellation is a status transition rather than a delete,
 * so the schedule keeps its history.
 */
export async function cancelVisitAction(form: FormData): Promise<void> {
  await requireCapability("MANAGE_VISITS");

  const id = str(form, "id");
  const reason = nullableStr(form, "reason");

  const before = id ? await getVisit(id) : null;
  if (!before) redirect(VISITS_PATH);
  if (before.status === "CANCELLED") redirect(`${VISITS_PATH}/${id}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("visits")
    .update({ status: "CANCELLED" })
    .eq("id", id);

  if (error) {
    redirect(
      `${VISITS_PATH}/${id}?error=${encodeURIComponent(
        describeDbError(error, "Could not cancel the visit."),
      )}`,
    );
  }

  await recordAuditLog({
    action: "STATUS_CHANGE",
    entityType: "visits",
    entityId: id,
    description: `Cancelled the ${before.visit_date} visit for ${before.delegation_name}`,
    oldValue: { status: before.status },
    newValue: { status: "CANCELLED" },
    reason,
  });

  revalidatePath(VISITS_PATH);
  revalidatePath(`${VISITS_PATH}/${id}`);
  redirect(`${VISITS_PATH}/${id}`);
}
