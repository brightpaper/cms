import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/current-user";

/**
 * Salesman section frame.
 *
 * Same defence-in-depth as the admin layout. Data scoping by PartyAssignments
 * is deliberately NOT applied yet — this step establishes identity only.
 */
export default async function SalesmanLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("salesman");

  return (
    <AppShell role="salesman" user={user}>
      {children}
    </AppShell>
  );
}
