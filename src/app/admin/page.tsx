import type { Metadata } from "next";

import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { loadPartyCount, loadPeriods } from "@/features/shared/page-data";

export const metadata: Metadata = { title: "Admin dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [periods, partyCount] = await Promise.all([
    loadPeriods(),
    loadPartyCount(),
  ]);

  return (
    <DashboardView role="admin" periods={periods} partyCount={partyCount} />
  );
}
