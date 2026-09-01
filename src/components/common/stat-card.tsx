import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  readonly label: string;
  /**
   * Already-formatted value. This component never computes or aggregates —
   * pass `undefined` while the real figure is still unavailable.
   */
  readonly value: string | undefined;
  readonly hint?: string;
  readonly icon?: LucideIcon;
  /** Which half of the logo this tile leans on. */
  readonly tone?: "brand" | "accent";
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: StatCardProps) {
  const isAccent = tone === "accent";

  return (
    <Card className="relative overflow-hidden">
      {/* Top edge in the tile's brand colour. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          isAccent ? "bg-brand-accent" : "bg-brand",
        )}
      />

      <CardContent className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.68rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-heading truncate text-2xl font-bold tracking-tight tabular-nums">
            {value ?? "—"}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>

        {Icon ? (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              isAccent
                ? "bg-brand-accent-tint text-brand-accent dark:bg-brand-accent/15"
                : "bg-brand-tint text-brand dark:bg-brand/15 dark:text-brand-light",
            )}
          >
            <Icon className="size-[1.1rem]" aria-hidden />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
