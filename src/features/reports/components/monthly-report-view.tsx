import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { IntegrationStatus } from "@/components/common/integration-status";
import { MonthFilter } from "@/components/common/month-filter";
import { PageHeader } from "@/components/common/page-header";
import { PendingIntegration } from "@/components/common/pending-integration";
import { Card, CardContent } from "@/components/ui/card";
import { API_ACTIONS } from "@/lib/api/actions";
import type { LoadResult } from "@/lib/api/load";
import type { MonthKey } from "@/types/common";
import type { UserRole } from "@/types/user";

interface MonthlyReportViewProps {
  readonly role: UserRole;
  readonly periods: LoadResult<readonly MonthKey[]>;
  readonly selectedMonth: MonthKey | undefined;
}

/**
 * The month selector is live; the figures are not.
 *
 * Monthly aggregation is a later step, so nothing here displays a total — an
 * invented number would be worse than an empty panel.
 */
export function MonthlyReportView({
  role,
  periods,
  selectedMonth,
}: MonthlyReportViewProps) {
  const isAdmin = role === "admin";
  const months = periods.ok ? periods.data : [];

  return (
    <>
      <PageHeader
        title="Monthly reports"
        description={
          isAdmin
            ? "Month-by-month collection performance across all salesmen."
            : "Your month-by-month collection performance. Earlier months stay available indefinitely."
        }
        actions={<MonthFilter months={months} selected={selectedMonth} />}
      />

      {periods.ok ? null : <IntegrationStatus error={periods.error} />}

      <PendingIntegration
        actions={[API_ACTIONS.reports.monthlySummary]}
        note="The month list is read live from the sheets, but the totals themselves are not calculated yet. The MonthlySummary tab exists as structure only."
      />

      <Card>
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="Summary calculations not implemented"
            description="Monthly aggregation over Collections and H&S outstanding arrives in a later step."
          />
        </CardContent>
      </Card>
    </>
  );
}
