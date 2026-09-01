import type { Metadata } from "next";

import { UsersView } from "@/features/users/components/users-view";
import { load } from "@/lib/api/load";
import { requireRole } from "@/lib/auth/current-user";
import { listUsers } from "@/services/users.service";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

/**
 * Admin-only. The layout already requires an admin session; `requireRole` here
 * also gives the view the signed-in user, so it can prevent self-deactivation.
 */
export default async function AdminUsersPage() {
  const currentUser = await requireRole("admin");
  const users = await load(() => listUsers());
  return <UsersView users={users} currentUser={currentUser} />;
}
