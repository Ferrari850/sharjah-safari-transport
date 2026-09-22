"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { navItemsFor } from "@/components/layout/nav-items";
import { getTranslator } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { UserRole } from "@/lib/constants/roles";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Vertical navigation for the desktop sidebar. */
export function SidebarNav({
  role,
  locale = DEFAULT_LOCALE,
}: {
  role: UserRole;
  locale?: Locale;
}) {
  const pathname = usePathname();
  const items = navItemsFor(role);
  const t = getTranslator(locale);

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label={t("nav.main")}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Horizontal, scrollable navigation shown below the header on small
 * screens, where the sidebar is hidden.
 */
export function MobileNav({
  role,
  locale = DEFAULT_LOCALE,
}: {
  role: UserRole;
  locale?: Locale;
}) {
  const pathname = usePathname();
  const items = navItemsFor(role);
  const t = getTranslator(locale);

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-2 lg:hidden"
      aria-label={t("nav.main")}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
