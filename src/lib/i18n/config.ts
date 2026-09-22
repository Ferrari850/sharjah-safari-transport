/**
 * Locale and text-direction configuration.
 *
 * Phase 2 ships the *scaffolding* only: the plumbing to run the app in
 * either direction, plus a small dictionary covering navigation and common
 * actions. Translating the full interface is deliberately left for a later
 * phase — what matters now is that no layout assumes left-to-right, so that
 * work is additive rather than a rewrite.
 */

export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie the chosen locale is remembered in. */
export const LOCALE_COOKIE = "sstms-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/** Text direction for a locale. Arabic is the only RTL locale so far. */
export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
