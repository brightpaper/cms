"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Loader2, LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/config/routes";
import { http } from "@/lib/api/http";
import type { SessionUser } from "@/types/user";

interface UserMenuProps {
  readonly user: SessionUser | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [isSigningOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await http.post("/auth/logout");
    } catch {
      // Even if the call fails, send the user to /login: the protected routes
      // are enforced server-side, so they cannot get back in without a session.
    }
    router.replace(ROUTES.login);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <UserRound className="size-4" aria-hidden />
          <span className="hidden max-w-32 truncate sm:inline">
            {user?.name ?? "Not signed in"}
          </span>
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">
            {user?.name ?? "No active session"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {user ? `@${user.username} · ${user.role}` : "Sign in to continue"}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={!user || isSigningOut}
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
        >
          {isSigningOut ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <LogOut className="size-4" aria-hidden />
          )}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
