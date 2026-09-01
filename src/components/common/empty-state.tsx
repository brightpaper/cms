import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  readonly icon?: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {Icon ? (
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-tint text-brand dark:bg-brand/15 dark:text-brand-light">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
