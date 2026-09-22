"use client";

import { useState, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A destructive or state-changing action behind a confirmation dialog.
 *
 * `action` is a Server Action, so the mutation runs server-side with its own
 * capability check — the dialog is a guard against mistakes, never the
 * authorization boundary.
 */
export function ConfirmAction({
  action,
  fields,
  trigger,
  triggerVariant = "outline",
  triggerSize,
  title,
  description,
  confirmLabel,
  confirmVariant = "destructive",
  withReason = false,
  reasonLabel = "Reason (recorded in the audit trail)",
  reasonRequired = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** Hidden inputs identifying the target, e.g. `{ id, status }`. */
  fields?: Record<string, string>;
  trigger: ReactNode;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: ButtonProps["variant"];
  withReason?: boolean;
  reasonLabel?: string;
  reasonRequired?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} type="button">
          {trigger}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form action={action} className="space-y-4">
          {Object.entries(fields ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {withReason && (
            <div className="space-y-2">
              <Label htmlFor="confirm-reason">{reasonLabel}</Label>
              <Textarea
                id="confirm-reason"
                name="reason"
                rows={3}
                required={reasonRequired}
                placeholder="Why is this change being made?"
              />
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton variant={confirmVariant}>{confirmLabel}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
