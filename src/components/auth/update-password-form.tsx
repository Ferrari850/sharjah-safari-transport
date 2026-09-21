"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_RECOVERY_REDIRECT_PATH,
} from "@/lib/constants/auth";
import { recordPasswordChange } from "@/app/auth/update-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** How long the success message stays up before we move to /login. */
const REDIRECT_DELAY_MS = 1800;

type Stage = "verifying" | "ready" | "invalid" | "done";

export function UpdatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stage, setStage] = useState<Stage>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The recovery code is single-use, so the exchange must run exactly once
  // even though React re-runs effects in development's strict mode.
  const verifyStartedRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (verifyStartedRef.current) return;
    verifyStartedRef.current = true;

    const code = searchParams.get("code");
    // Supabase appends these when the link is expired or already spent.
    const linkError =
      searchParams.get("error_description") ?? searchParams.get("error");

    async function verifyRecoverySession() {
      if (linkError) {
        setStage("invalid");
        return;
      }

      try {
        const supabase = createClient();

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            setStage("invalid");
            return;
          }

          // Drop the single-use code from the address bar and history.
          router.replace(PASSWORD_RECOVERY_REDIRECT_PATH);
        }

        // getUser() revalidates the token with Supabase rather than trusting
        // whatever is in the cookie.
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setStage(user ? "ready" : "invalid");
      } catch {
        // Never leave the page spinning on "Verifying…"; fail closed so the
        // user is offered a fresh link instead.
        setStage("invalid");
      }
    }

    void verifyRecoverySession();
  }, [router, searchParams]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      try {
        await recordPasswordChange();
      } catch {
        // Audit logging must never block a completed password reset.
      }

      // A password reset should end every existing session, not just this
      // one — anyone still holding an old session is signed out.
      await supabase.auth.signOut({ scope: "global" });

      setStage("done");
      setLoading(false);
      router.refresh();

      redirectTimerRef.current = setTimeout(() => {
        router.replace("/login?reset=success");
      }, REDIRECT_DELAY_MS);
    } catch {
      setError("Could not reach the server. Check your connection and retry.");
      setLoading(false);
    }
  }

  if (stage === "verifying") {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Verifying your recovery link…
      </div>
    );
  }

  if (stage === "invalid") {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            This password reset link is invalid or has expired. Request a new
            one to continue.
          </AlertDescription>
        </Alert>

        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <Alert className="border-primary/50 text-primary [&>svg]:text-primary">
        <CheckCircle2 className="size-4" />
        <AlertDescription>
          Password updated. Redirecting you to sign in…
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
