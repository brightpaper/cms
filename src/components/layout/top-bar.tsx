import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Badge } from "@/components/ui/badge";
import type { SessionUser, UserRole } from "@/types/user";

interface TopBarProps {
  readonly role: UserRole;
  readonly homeHref: string;
  readonly user: SessionUser | null;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrator",
  salesman: "Salesman",
};

export function TopBar({ role, homeHref, user }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur-md sm:px-6">
      <MobileNav role={role} homeHref={homeHref} />

      <Badge className="gap-1.5 border-transparent bg-brand-tint text-brand-dark dark:bg-secondary dark:text-secondary-foreground">
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-brand-accent"
        />
        {ROLE_LABEL[role]}
      </Badge>

      <div className="ml-auto flex items-center gap-2">
        <UserMenu user={user} />
      </div>
    </header>
  );
}
