import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/types";

/** Renders whatever a Server Action returned, if anything. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }

  if (state.success) {
    return (
      <Alert className="border-primary/50 text-primary [&>svg]:text-primary">
        <CheckCircle2 className="size-4" />
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return null;
}
