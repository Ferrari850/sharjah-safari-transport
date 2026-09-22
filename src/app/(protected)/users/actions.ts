"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog, diffValues } from "@/lib/auth/audit";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/constants/roles";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants/auth";
import {
  describeDbError,
  enumOf,
  fail,
  isEmail,
  nullableStr,
  requestOrigin,
  str,
  succeed,
} from "@/lib/actions/helpers";
import { getUser } from "@/lib/data/users";
import type { ActionState } from "@/types";

const USERS_PATH = "/users";

/**
 * Create a login.
 *
 * The account itself is created with the secret-key admin client, which is
 * the only way to provision an auth user server-side — `requireCapability`
 * runs first, and this module is server-only so the key never reaches the
 * browser. The profile row is then updated through the *session* client, so
 * the role assignment is still checked by RLS and the
 * protect_profile_privileges trigger rather than bypassing them.
 */
export async function createUserAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireCapability("MANAGE_USERS");

  const email = str(form, "email").toLowerCase();
  const fullName = str(form, "full_name");
  const role = enumOf(form, "role", ALL_ROLES);
  const employeeNumber = nullableStr(form, "employee_number");
  const phone = nullableStr(form, "phone");
  const mode = enumOf(form, "mode", ["password", "invite"] as const);
  const password = str(form, "password");

  if (!isEmail(email)) return fail("Enter a valid email address.");
  if (fullName === "") return fail("Full name is required.");
  if (!role) return fail("Choose a role.");
  if (!mode) return fail("Choose how the account should be activated.");
  if (mode === "password" && password.length < MIN_PASSWORD_LENGTH) {
    return fail(
      `The initial password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  const admin = createAdminClient();
  let userId: string;

  if (mode === "invite") {
    const origin = await requestOrigin();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/update-password`,
      data: { full_name: fullName },
    });
    if (error || !data.user) {
      return fail(error?.message ?? "Could not send the invitation.");
    }
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) {
      return fail(error?.message ?? "Could not create the account.");
    }
    userId = data.user.id;
  }

  // handle_new_user() has already created the profile at the least-privileged
  // DRIVER role. Apply the requested details through the session client.
  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      employee_number: employeeNumber,
      phone,
    })
    .eq("id", userId);

  if (profileError) {
    return fail(
      describeDbError(
        profileError,
        "The account was created but its details could not be saved. Edit the user to finish setting it up.",
      ),
    );
  }

  await recordAuditLog({
    action: "INSERT",
    entityType: "profiles",
    entityId: userId,
    description: `Created user ${email} as ${ROLE_LABELS[role]}`,
    newValue: {
      email,
      full_name: fullName,
      role,
      employee_number: employeeNumber,
      phone,
      activation: mode,
    },
  });

  revalidatePath(USERS_PATH);
  redirect(`${USERS_PATH}/${userId}`);
}

/** Edit employee information. Role and active state are handled separately. */
export async function updateUserAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireCapability("MANAGE_USERS");

  const id = str(form, "id");
  const before = id ? await getUser(id) : null;
  if (!before) return fail("That user no longer exists.");

  const patch = {
    full_name: str(form, "full_name"),
    employee_number: nullableStr(form, "employee_number"),
    phone: nullableStr(form, "phone"),
  };

  if (patch.full_name === "") return fail("Full name is required.");

  const { oldValue, newValue, changed } = diffValues(before, patch);
  if (changed.length === 0) return succeed("No changes to save.");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) return fail(describeDbError(error, "Could not save the user."));

  await recordAuditLog({
    action: "UPDATE",
    entityType: "profiles",
    entityId: id,
    description: `Updated ${changed.join(", ")} for ${before.email}`,
    oldValue,
    newValue,
  });

  revalidatePath(USERS_PATH);
  revalidatePath(`${USERS_PATH}/${id}`);
  return succeed("User details saved.");
}

/** Change a user's role. Always audited as ROLE_CHANGE. */
export async function changeUserRoleAction(form: FormData): Promise<void> {
  await requireCapability("MANAGE_USERS");

  const id = str(form, "id");
  const role = enumOf(form, "role", ALL_ROLES);
  const reason = nullableStr(form, "reason");

  const before = id ? await getUser(id) : null;
  if (!before) redirect(USERS_PATH);
  if (!role) redirect(`${USERS_PATH}/${id}?error=Choose%20a%20valid%20role.`);
  if (before.role === role) redirect(`${USERS_PATH}/${id}`);

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);

  if (error) {
    redirect(
      `${USERS_PATH}/${id}?error=${encodeURIComponent(
        describeDbError(error, "Could not change the role."),
      )}`,
    );
  }

  await recordAuditLog({
    action: "ROLE_CHANGE",
    entityType: "profiles",
    entityId: id,
    description: `Role changed from ${ROLE_LABELS[before.role]} to ${ROLE_LABELS[role]} for ${before.email}`,
    oldValue: { role: before.role },
    newValue: { role },
    reason,
  });

  revalidatePath(USERS_PATH);
  revalidatePath(`${USERS_PATH}/${id}`);
  redirect(`${USERS_PATH}/${id}`);
}

/** Activate or deactivate a login. Always audited as STATUS_CHANGE. */
export async function setUserActiveAction(form: FormData): Promise<void> {
  await requireCapability("MANAGE_USERS");

  const id = str(form, "id");
  const active = str(form, "active") === "true";
  const reason = nullableStr(form, "reason");

  const before = id ? await getUser(id) : null;
  if (!before) redirect(USERS_PATH);
  if (before.is_active === active) redirect(`${USERS_PATH}/${id}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", id);

  if (error) {
    redirect(
      `${USERS_PATH}/${id}?error=${encodeURIComponent(
        describeDbError(error, "Could not change the account status."),
      )}`,
    );
  }

  await recordAuditLog({
    action: "STATUS_CHANGE",
    entityType: "profiles",
    entityId: id,
    description: `${active ? "Activated" : "Deactivated"} ${before.email}`,
    oldValue: { is_active: before.is_active },
    newValue: { is_active: active },
    reason,
  });

  revalidatePath(USERS_PATH);
  revalidatePath(`${USERS_PATH}/${id}`);
  redirect(`${USERS_PATH}/${id}`);
}
