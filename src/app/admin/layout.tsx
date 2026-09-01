import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/current-user";

/**
 * Admin section frame.
 *
 * `proxy.ts` already filters this route, but the check is repeated here so the
 * page cannot render without a verified admin session even if the matcher is
 * ever changed. The role is read from the signed cookie, never from the URL.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("admin");

  return (
    <AppShell role="admin" user={user}>
      {children}
    </AppShell>
  );
}
