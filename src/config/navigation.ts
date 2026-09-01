import {
  Building2,
  FileSpreadsheet,
  LayoutDashboard,
  PhoneCall,
  Settings,
  Users,
  Wallet,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/config/routes";
import type { UserRole } from "@/types/user";

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  /**
   * When true the link is only active on an exact path match. Used for section
   * roots (e.g. `/admin`) that would otherwise stay highlighted everywhere.
   */
  readonly exact?: boolean;
}

export interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

const ADMIN_NAV: readonly NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: ROUTES.admin.root,
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "Collection",
    items: [
      { label: "Parties", href: ROUTES.admin.parties, icon: Building2 },
      { label: "Collections", href: ROUTES.admin.collections, icon: Wallet },
      { label: "Follow-ups", href: ROUTES.admin.followUps, icon: PhoneCall },
      { label: "Monthly Reports", href: ROUTES.admin.reports, icon: BarChart3 },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "H&S Outstanding",
        href: ROUTES.admin.outstanding,
        icon: FileSpreadsheet,
      },
      { label: "Users", href: ROUTES.admin.users, icon: Users },
      { label: "Settings", href: ROUTES.admin.settings, icon: Settings },
    ],
  },
];

const SALESMAN_NAV: readonly NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: ROUTES.salesman.root,
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "My Work",
    items: [
      { label: "My Parties", href: ROUTES.salesman.parties, icon: Building2 },
      { label: "Collections", href: ROUTES.salesman.collections, icon: Wallet },
      { label: "Follow-ups", href: ROUTES.salesman.followUps, icon: PhoneCall },
      {
        label: "Monthly Reports",
        href: ROUTES.salesman.reports,
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: ROUTES.salesman.settings, icon: Settings },
    ],
  },
];

export const NAVIGATION_BY_ROLE: Record<UserRole, readonly NavSection[]> = {
  admin: ADMIN_NAV,
  salesman: SALESMAN_NAV,
};
