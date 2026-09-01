import type { Metadata } from "next";

import { MonthlyReportView } from "@/features/reports/components/monthly-report-view";
import { loadPeriods, readMonthParam } from "@/features/shared/page-data";

export const metadata: Metadata = { title: "Monthly reports" };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: PageProps<"/admin/reports">) {
  const month = readMonthParam((await searchParams).month);
  return (
    <MonthlyReportView
      role="admin"
      periods={await loadPeriods()}
      selectedMonth={month}
    />
  );
}
