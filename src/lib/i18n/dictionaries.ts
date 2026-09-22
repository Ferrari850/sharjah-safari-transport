import { DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Translation dictionary.
 *
 * Intentionally small: it covers navigation and the handful of words that
 * appear on every screen, which is enough to prove the pipeline end to end.
 * Keys are typed, so adding a key to English without translating it is a
 * compile error rather than a silent English string in an Arabic UI.
 */
const en = {
  "nav.dashboard": "Dashboard",
  "nav.users": "Users",
  "nav.drivers": "Drivers",
  "nav.vehicles": "Vehicles",
  "nav.visits": "Visits / Trips",
  "nav.audit": "Audit Logs",
  "nav.types": "Types",
  "nav.main": "Main",
  "common.signOut": "Sign out",
  "common.language": "Language",
  "common.search": "Search",
  "common.apply": "Apply",
  "common.clear": "Clear",
  "common.cancel": "Cancel",
  "common.save": "Save changes",
  "common.active": "Active",
  "common.inactive": "Inactive",
} as const;

export type MessageKey = keyof typeof en;

const ar: Record<MessageKey, string> = {
  "nav.dashboard": "لوحة المعلومات",
  "nav.users": "المستخدمون",
  "nav.drivers": "السائقون",
  "nav.vehicles": "المركبات",
  "nav.visits": "الزيارات / الرحلات",
  "nav.audit": "سجل التدقيق",
  "nav.types": "الأنواع",
  "nav.main": "الرئيسية",
  "common.signOut": "تسجيل الخروج",
  "common.language": "اللغة",
  "common.search": "بحث",
  "common.apply": "تطبيق",
  "common.clear": "مسح",
  "common.cancel": "إلغاء",
  "common.save": "حفظ التغييرات",
  "common.active": "نشط",
  "common.inactive": "غير نشط",
};

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, ar };

export type Translate = (key: MessageKey) => string;

/**
 * Translator for a locale. Falls back to English for anything untranslated,
 * so a partially translated build renders rather than showing raw keys.
 */
export function getTranslator(locale: Locale): Translate {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  return (key) => dictionary[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
}
