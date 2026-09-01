import { PlugZap } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PendingIntegrationProps {
  /** The Apps Script action(s) this screen will call once the backend exists. */
  readonly actions: readonly string[];
  readonly note?: string;
}

/**
 * Explicit marker that a screen is structurally complete but not yet connected
 * to Google Sheets. Preferred over rendering sample rows, so nobody mistakes a
 * placeholder for real collection data.
 */
export function PendingIntegration({ actions, note }: PendingIntegrationProps) {
  return (
    <Alert className="mb-6 border-brand-accent/30 bg-brand-accent-tint dark:bg-brand-accent/10">
      <PlugZap className="text-brand-accent" aria-hidden />
      <AlertTitle>Not connected to Google Sheets yet</AlertTitle>
      <AlertDescription>
        <span className="block">
          {note ??
            "This screen renders its real structure but has no data source. It will be wired to the Apps Script backend in a later step."}
        </span>
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          {actions.map((action) => (
            <code
              key={action}
              className="rounded-md bg-background/70 px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
            >
              {action}
            </code>
          ))}
        </span>
      </AlertDescription>
    </Alert>
  );
}
