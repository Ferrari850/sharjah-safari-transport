import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getTranslator, type Translate } from "./dictionaries";

/** The viewer's locale, from their cookie, defaulting to English. */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE)?.value;
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Translator bound to the viewer's locale, for use in Server Components. */
export async function getT(): Promise<Translate> {
  return getTranslator(await getLocale());
}
