"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Signs out via a POST to the /auth/signout route handler (never a GET,
 * so it can't be triggered by a prefetch or a crawler).
 */
export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <form action="/auth/signout" method="post" onSubmit={() => setLoading(true)}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={loading}
        className="text-muted-foreground"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogOut className="size-4" />
        )}
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  );
}
