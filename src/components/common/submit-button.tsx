"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button that reports the enclosing form's pending state, so every
 * mutation in the app gets a loading affordance without wiring state by hand.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
