import { Plus, Wallet } from "lucide-react";

import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { IntegrationStatus } from "@/components/common/integration-status";
import { MonthFilter } from "@/components/common/month-filter";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { collectionColumns } from "@/features/collections/columns";
import type { LoadResult } from "@/lib/api/load";
import { formatMonthLabel } from "@/lib/utils/period";
import type { Collection } from "@/types/collection";
import type { MonthKey } from "@/types/common";
import type { UserRole } from "@/types/user";

interface CollectionsViewProps {
  readonly role: UserRole;
  readonly collections: LoadResult<readonly Collection[]>;
  readonly periods: LoadResult<readonly MonthKey[]>;
  readonly selectedMonth: MonthKey | undefined;
}

/**
 * Month-wise collection register.
 *
 * Every transaction keeps the `monthKey` it was written with, so selecting an
 * earlier month simply filters — no historical row is moved or rewritten.
 */
export function CollectionsView({
  role,
  collections,
  periods,
  selectedMonth,
}: CollectionsViewProps) {
  const isAdmin = role === "admin";
  const rows = collections.ok ? collections.data : [];
  const months = periods.ok ? periods.data : [];

  return (
    <>
      <PageHeader
        title="Collections"
        description={
          isAdmin
            ? "Every collection entry, partitioned by month. Past months are retained permanently."
            : "Collection entries for the selected month. Past months stay visible."
        }
        actions={
          <>
            <MonthFilter months={months} selected={selectedMonth} />
            <Button disabled title="Adding entries arrives in a later step">
              <Plus aria-hidden />
              Add entry
            </Button>
          </>
        }
      />

      {collections.ok ? null : <IntegrationStatus error={collections.error} />}

      <DataTable
        columns={collectionColumns}
        rows={rows}
        getRowId={(entry) => entry.collectionId}
        caption="Collection entries"
        emptyState={
          <EmptyState
            icon={Wallet}
            title={
              selectedMonth
                ? `No collections in ${formatMonthLabel(selectedMonth)}`
                : "No collection entries yet"
            }
            description="Entries written to the Collections tab appear here, filtered by month."
          />
        }
      />
    </>
  );
}
