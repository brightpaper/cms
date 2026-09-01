import { PhoneCall, Plus } from "lucide-react";

import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { IntegrationStatus } from "@/components/common/integration-status";
import { MonthFilter } from "@/components/common/month-filter";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { followUpColumns } from "@/features/follow-ups/columns";
import type { LoadResult } from "@/lib/api/load";
import { formatMonthLabel } from "@/lib/utils/period";
import type { MonthKey } from "@/types/common";
import type { FollowUp } from "@/types/follow-up";
import type { UserRole } from "@/types/user";

interface FollowUpsViewProps {
  readonly role: UserRole;
  readonly followUps: LoadResult<readonly FollowUp[]>;
  readonly periods: LoadResult<readonly MonthKey[]>;
  readonly selectedMonth: MonthKey | undefined;
}

export function FollowUpsView({
  role,
  followUps,
  periods,
  selectedMonth,
}: FollowUpsViewProps) {
  const isAdmin = role === "admin";
  const rows = followUps.ok ? followUps.data : [];
  const months = periods.ok ? periods.data : [];

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description={
          isAdmin
            ? "Remarks and next-follow-up commitments, month by month. History is never overwritten."
            : "Your remarks and the next follow-up date committed for each party."
        }
        actions={
          <>
            <MonthFilter months={months} selected={selectedMonth} />
            <Button disabled title="Adding follow-ups arrives in a later step">
              <Plus aria-hidden />
              Add follow-up
            </Button>
          </>
        }
      />

      {followUps.ok ? null : <IntegrationStatus error={followUps.error} />}

      <DataTable
        columns={followUpColumns}
        rows={rows}
        getRowId={(followUp) => followUp.followUpId}
        caption="Follow-ups"
        emptyState={
          <EmptyState
            icon={PhoneCall}
            title={
              selectedMonth
                ? `No follow-ups in ${formatMonthLabel(selectedMonth)}`
                : "No follow-ups yet"
            }
            description="Rows written to the FollowUps tab appear here, grouped by the month of the follow-up date."
          />
        }
      />
    </>
  );
}
