import type { Metadata } from "next";

import { FollowUpsView } from "@/features/follow-ups/components/follow-ups-view";
import { loadFollowUps, loadPeriods, readMonthParam } from "@/features/shared/page-data";

export const metadata: Metadata = { title: "Follow-ups" };
export const dynamic = "force-dynamic";

export default async function AdminFollowUpsPage({
  searchParams,
}: PageProps<"/admin/follow-ups">) {
  const month = readMonthParam((await searchParams).month);
  const [followUps, periods] = await Promise.all([
    loadFollowUps(month),
    loadPeriods(),
  ]);

  return (
    <FollowUpsView
      role="admin"
      followUps={followUps}
      periods={periods}
      selectedMonth={month}
    />
  );
}
