import type { ReactNode } from "react";

/**
 * Bare frame for unauthenticated screens — no sidebar, no nav. The soft green
 * wash and orange bloom echo the public site's hero treatment.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-brand-tint px-4 py-10 dark:bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-brand/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 size-96 rounded-full bg-brand-accent/20 blur-3xl"
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
