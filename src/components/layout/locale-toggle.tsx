import { Globe } from "lucide-react";

import { setLocaleAction } from "@/lib/i18n/actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

/**
 * Language switcher.
 *
 * Switching flips `dir` on <html>, so this doubles as the way to check that
 * a screen survives right-to-left while the translation work is still
 * outstanding.
 */
export function LocaleToggle({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);

  return (
    <form action={setLocaleAction} className="flex items-center">
      <span className="sr-only">{t("common.language")}</span>
      <Globe className="me-1 size-4 text-muted-foreground" aria-hidden />
      <div className="flex overflow-hidden rounded-md border">
        {LOCALES.map((option) => (
          <button
            key={option}
            type="submit"
            name="locale"
            value={option}
            aria-current={option === locale ? "true" : undefined}
            className={cn(
              "px-2 py-1 text-xs font-medium transition-colors",
              option === locale
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {LOCALE_LABELS[option]}
          </button>
        ))}
      </div>
    </form>
  );
}
