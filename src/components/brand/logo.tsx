import { cn } from "@/lib/utils";

/**
 * Neutral, original mark for the Sharjah Safari Transport system —
 * an acacia/savanna silhouette over a sun disc. Not a real logo; safe
 * to replace with the official EPAA / Sharjah Safari asset later.
 */
export function SafariLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <circle cx="24" cy="24" r="22" className="fill-primary/10" />
      <circle cx="24" cy="20" r="7" className="fill-accent" />
      <path
        d="M6 40c4-1 6-4 9-4s4 2 6 2 4-3 7-3 4 2 6 2 5-2 8-1"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 40V22M24 27l-5-3M24 30l6-4"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
