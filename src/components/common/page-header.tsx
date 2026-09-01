import type { ReactNode } from "react";

interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  /** Right-aligned controls: primary action buttons, filters, month selector. */
  readonly actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {/* Short diagonal-coloured rule, echoing the logo. */}
        <div
          aria-hidden
          className="bp-accent-rule mt-2 h-0.5 w-12 rounded-full"
        />
        {description ? (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
