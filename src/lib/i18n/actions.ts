"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { LOCALE_COOKIE, isLocale } from "./config";

/**
 * Switch the interface language.
 *
 * Open to any signed-in user: a locale preference carries no privilege, and
 * the value is validated against the known list rather than trusted.
 */
export async function setLocaleAction(form: FormData): Promise<void> {
  const requested = form.get("locale");
  if (!isLocale(requested)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, requested, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false, // a display preference, readable by the client
  });

  // The direction lives on <html>, so the whole layout must re-render.
  revalidatePath("/", "layout");
}
