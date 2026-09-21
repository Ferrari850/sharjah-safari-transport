import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      description="Enter your credentials to access the system."
    >
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-md bg-muted" />}
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
