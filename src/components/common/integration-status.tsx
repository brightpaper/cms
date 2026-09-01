import { AlertTriangle, PlugZap, ServerCrash } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ApiErrorBody } from "@/types/api";

interface IntegrationStatusProps {
  readonly error: ApiErrorBody;
}

/**
 * Honest reporting of why a screen has no data.
 *
 * Never a substitute for data and never a placeholder that looks like data —
 * it states which of the three cases applies: backend not configured, action
 * not built yet, or a real failure talking to Apps Script.
 */
export function IntegrationStatus({ error }: IntegrationStatusProps) {
  if (error.code === "NOT_CONFIGURED") {
    return (
      <Alert className="mb-6 border-brand-accent/30 bg-brand-accent-tint dark:bg-brand-accent/10">
        <PlugZap className="text-brand-accent" aria-hidden />
        <AlertTitle>Google Sheets backend not configured</AlertTitle>
        <AlertDescription>
          <span className="block">
            Deploy the Apps Script web app, then set{" "}
            <code className="font-mono text-[0.75rem]">APPS_SCRIPT_URL</code> and{" "}
            <code className="font-mono text-[0.75rem]">APPS_SCRIPT_API_KEY</code>{" "}
            in <code className="font-mono text-[0.75rem]">.env.local</code>.
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            See docs/architecture.md for the full setup walkthrough.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  if (error.code === "NOT_IMPLEMENTED") {
    return (
      <Alert className="mb-6">
        <AlertTriangle aria-hidden />
        <AlertTitle>Not built yet</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <ServerCrash aria-hidden />
      <AlertTitle>Could not load data</AlertTitle>
      <AlertDescription>
        <span className="block">{error.message}</span>
        <span className="mt-1 block font-mono text-xs opacity-70">
          {error.code}
        </span>
      </AlertDescription>
    </Alert>
  );
}
