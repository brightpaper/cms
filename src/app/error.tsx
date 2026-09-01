"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Shows the message only — stack traces and upstream
 * details stay on the server.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-heading text-lg font-semibold">Something went wrong</p>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
