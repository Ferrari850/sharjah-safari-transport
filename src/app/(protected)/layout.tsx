import { requireProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Guards every route under (protected). `requireProfile` redirects to
 * /login when there is no active session/profile — a server-side check
 * layered on top of the middleware and database RLS.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return <AppShell profile={profile}>{children}</AppShell>;
}
