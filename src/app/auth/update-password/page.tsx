import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
};

/**
 * Landing page for the emailed recovery link. The link arrives with a
 * single-use `code`, which the form exchanges for a session before
 * allowing a password change. The route sits under `/auth`, which the
 * middleware already treats as public, so an unauthenticated visitor can
 * reach it — the session check happens in the form itself.
 */
export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      description="Choose a new password for your account."
    >
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-md bg-muted" />}
      >
        <UpdatePasswordForm />
      </Suspense>
    </AuthShell>
  );
}
