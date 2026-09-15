import { Suspense } from "react";
import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { SafariLogo } from "@/components/brand/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <SafariLogo className="size-9" />
          <span className="text-lg font-semibold tracking-tight">
            {siteConfig.name}
          </span>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Transport Management System
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            Coordinate drivers, trips, and assignments across Sharjah Safari —
            securely, in one place.
          </p>
        </div>

        <p className="text-sm text-primary-foreground/70">
          {siteConfig.org}
        </p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <SafariLogo className="size-8" />
            <span className="font-semibold">{siteConfig.name}</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to access the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={<div className="h-64 animate-pulse rounded-md bg-muted" />}
              >
                <LoginForm />
              </Suspense>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Authorized personnel only. Access is monitored and audited.
          </p>
        </div>
      </section>
    </main>
  );
}
