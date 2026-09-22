import "server-only";

import { headers } from "next/headers";

import type { ActionState } from "@/types";

export function fail(error: string): ActionState {
  return { error };
}

export function succeed(success: string): ActionState {
  return { success };
}

/** A required, trimmed string field. Returns "" when absent. */
export function str(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** An optional field: empty string becomes null so it lands as SQL NULL. */
export function nullableStr(form: FormData, name: string): string | null {
  const value = str(form, name);
  return value === "" ? null : value;
}

/** A positive integer field, or null when absent/invalid. */
export function intOf(form: FormData, name: string): number | null {
  const raw = str(form, name);
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * A field constrained to a known vocabulary.
 *
 * The browser is never trusted to supply an enum value: anything outside
 * the allowed list is rejected rather than passed to the database.
 */
export function enumOf<T extends string>(
  form: FormData,
  name: string,
  allowed: readonly T[],
): T | null {
  const raw = str(form, name);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value) && value.length <= 254;
}

/**
 * Turn a PostgREST / Postgres error into something an operator can act on,
 * without leaking schema internals into the UI.
 */
export function describeDbError(
  error: { code?: string; message?: string } | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;

  switch (error.code) {
    case "23505": // unique_violation
      return "That value is already taken — employee number, vehicle number, plate number and linked login must each be unique.";
    case "23514": // check_violation
      return "One of the values is outside the allowed range.";
    case "23503": // foreign_key_violation
      return "A linked record no longer exists. Reload the page and try again.";
    case "23001": // restrict_violation — raised by protect_last_admin()
      return "Refusing to remove the last active administrator. Promote another administrator first.";
    case "42501": // insufficient_privilege / RLS refusal
      return "You do not have permission to make that change.";
    default:
      break;
  }

  // The last-admin guard raises with a message worth surfacing verbatim.
  if (error.message?.includes("last active administrator")) {
    return "Refusing to remove the last active administrator. Promote another administrator first.";
  }
  if (error.message?.toLowerCase().includes("row-level security")) {
    return "You do not have permission to make that change.";
  }

  return fallback;
}

/**
 * Absolute origin to use in links sent by email.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when it is set, because `x-forwarded-host` is
 * attacker-controllable in principle — a request can carry any value, and a
 * poisoned origin would put a foreign domain into an invitation link.
 *
 * Falling back to the forwarded headers is still safe in practice: Supabase
 * only honours a `redirectTo` that matches its configured redirect
 * allow-list and otherwise substitutes the project's Site URL, so a spoofed
 * host cannot redirect an invitee anywhere. Set the variable to remove the
 * reliance on that second line of defence.
 */
export async function requestOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}
