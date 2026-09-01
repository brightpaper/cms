"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAVIGATION_BY_ROLE } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/user";

interface SidebarNavProps {
  readonly role: UserRole;
  /** Called after a link is followed — used to close the mobile drawer. */
  readonly onNavigate?: () => void;
}

function isActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Resolves its own sections from `role`. The nav config holds icon *components*,
 * which cannot be passed as props across the server/client boundary — so the
 * lookup happens here, on the client, and only the role crosses over.
 */
export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const sections = NAVIGATION_BY_ROLE[role];

  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          <p className="px-3 pb-2 text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {section.title}
          </p>

          {section.items.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg py-2 pr-3 pl-3.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                {/* Orange marker on the active row — the logo's accent half. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1.5 bottom-1.5 left-0 w-1 rounded-full bg-brand-accent transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active
                      ? "text-brand"
                      : "text-muted-foreground group-hover:text-brand",
                  )}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
