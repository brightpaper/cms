import type { ReactNode } from "react";

import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";
import { ROLE_HOME_ROUTE } from "@/config/routes";
import type { SessionUser, UserRole } from "@/types/user";

interface AppShellProps {
  readonly role: UserRole;
  /** `null` until authentication is wired up in Step 3. */
  readonly user?: SessionUser | null;
  readonly children: ReactNode;
}

/**
 * Responsive application frame: a fixed sidebar from `lg` up, a slide-over
 * drawer below it. Navigation is derived entirely from the role, so a route
 * group only has to declare which role it belongs to.
 */
export function AppShell({ role, user = null, children }: AppShellProps) {
  const homeHref = ROLE_HOME_ROUTE[role];

  return (
    <div className="flex min-h-svh w-full bg-background">
      {/*
        Sticky, full-height and self-start: a stretched flex item would be as
        tall as the whole page and could not stick, so it would scroll away with
        the content.
      */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-svh lg:self-start">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Brand href={homeHref} />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarNav role={role} />
        </div>

        {/* The logo diagonal, reused as a quiet footer rule. */}
        <div className="px-3 pb-4">
          <div className="bp-accent-rule h-0.5 w-full rounded-full opacity-70" />
          <p className="mt-3 px-1 text-[0.7rem] leading-relaxed text-muted-foreground">
            Bright Paper · Surat, Gujarat
            <br />
            Quality since 2007
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar role={role} homeHref={homeHref} user={user} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
