"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { PASSWORD_RECOVERY_REDIRECT_PATH } from "@/lib/constants/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}${PASSWORD_RECOVERY_REDIRECT_PATH}`,
        },
      );

      // Rate limiting is worth surfacing: it tells the user to wait rather
      // than to keep resending. Every other outcome — including an address
      // with no account — falls through to the same neutral confirmation, so
      // this form never reveals who does or does not have an account.
      if (resetError?.status === 429) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch {
      // A thrown request (offline, DNS, misconfiguration) must still end in
      // readable feedback rather than a button stuck on "Sending…".
      setError("Could not reach the server. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert className="border-primary/50 text-primary [&>svg]:text-primary">
          <MailCheck className="size-4" />
          <AlertDescription>
            If an account exists for that address, a password reset link is on
            its way. The link expires shortly — request another if it does.
          </AlertDescription>
        </Alert>

        <Button asChild variant="outline" className="w-full">
          <Link href="/login">
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
        </Button>
      </div>
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@sharjahsafari.ae"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Sending…" : "Send reset link"}
      </Button>

      <Button asChild variant="ghost" className="w-full">
        <Link href="/login">
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </Button>
    </form>
  );
}
