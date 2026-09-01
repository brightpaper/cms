"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserRole } from "@/types/user";

interface MobileNavProps {
  readonly role: UserRole;
  readonly homeHref: string;
}

/** The sidebar as a slide-over drawer, shown below the `lg` breakpoint. */
export function MobileNav({ role, homeHref }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu aria-hidden />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Links to the sections of the Collection Management System.
          </SheetDescription>
          <Brand href={homeHref} />
        </SheetHeader>
        <div className="overflow-y-auto px-2 py-4">
          <SidebarNav
            role={role}
            onNavigate={() => {
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
