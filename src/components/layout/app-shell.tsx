import { siteConfig } from "@/config/site";
import { SafariLogo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SignOutButton } from "@/components/auth/signout-button";
import { RoleBadge } from "@/components/common/role-badge";
import { ROLE_LABELS, type UserRole } from "@/lib/constants/roles";
import type { Profile } from "@/types";

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const displayName = profile.full_name || profile.email;
  const role = profile.role as UserRole;

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <SafariLogo className="size-7" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">{siteConfig.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {siteConfig.shortName}
            </p>
          </div>
        </div>
        <SidebarNav role={role} />
        <div className="mt-auto border-t p-4 text-[11px] text-muted-foreground">
          Phase 1 · Foundation
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <SafariLogo className="size-6" />
            <span className="text-sm font-semibold">{siteConfig.shortName}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[role]}
              </p>
            </div>
            <RoleBadge role={role} />
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
