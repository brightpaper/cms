import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  /** Rough shape of the page being loaded, so the swap does not jar. */
  readonly variant?: "table" | "cards";
  readonly rows?: number;
}

/**
 * Placeholder shown while a page's server data is still loading.
 *
 * Rendered by the section `loading.tsx` files, which sit *inside* the AppShell
 * — so the sidebar and top bar stay put and only the content area changes.
 * Every screen here waits on Google Apps Script, which reliably takes a couple
 * of seconds; without this the browser sits on the previous page with no
 * feedback at all.
 */
export function PageSkeleton({ variant = "table", rows = 6 }: PageSkeletonProps) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Mirrors PageHeader: title, accent rule, description, actions. */}
      <div className="mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-0.5 w-12" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      {variant === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="border-b bg-muted/60 px-4 py-3">
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="divide-y">
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="hidden h-4 w-1/6 md:block" />
                <Skeleton className="hidden h-4 w-1/6 md:block" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
