import { FileSpreadsheet } from "lucide-react";

import { IntegrationStatus } from "@/components/common/integration-status";
import { PageHeader } from "@/components/common/page-header";
import { SHEET_NAMES } from "@/config/constants";
import { ImportPanel } from "@/features/outstanding/components/import-panel";
import { OutstandingTable } from "@/features/outstanding/components/outstanding-table";
import type { LoadResult } from "@/lib/api/load";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import type { HnsOutstandingRecord } from "@/types/outstanding";

interface OutstandingViewProps {
  readonly records: LoadResult<readonly HnsOutstandingRecord[]>;
}

/**
 * Admin-only H&S outstanding screen.
 *
 * The ERP snapshot lives apart from collections by design: importing here
 * replaces this sheet and nothing else. Collections, follow-ups and monthly
 * data are never read or written by an import.
 */
export function OutstandingView({ records }: OutstandingViewProps) {
  const rows = records.ok ? records.data : [];
  // Totals are over the whole snapshot, not the page being displayed.
  const total = rows.reduce((sum, row) => sum + (row.balanceAmount ?? 0), 0);
  const lastImport = rows.length > 0 ? (rows[0]?.importDate ?? null) : null;

  return (
    <>
      <PageHeader
        title="H&S Outstanding"
        description={`Party-wise outstanding exported from the H&S accounting software, stored in the ${SHEET_NAMES.hnsOutstanding} tab. Importing replaces this snapshot and touches nothing else.`}
      />

      {records.ok ? null : <IntegrationStatus error={records.error} />}

      <ImportPanel />

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-base font-semibold">
            Current snapshot
          </h2>
          {rows.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {formatNumber(rows.length)} rows · {formatCurrency(total)} outstanding
              {lastImport ? ` · imported ${formatDate(lastImport)}` : ""}
            </p>
          ) : null}
        </div>

        {rows.length === 0 && records.ok ? (
          <div className="rounded-xl border bg-card px-6 py-12 text-center">
            <FileSpreadsheet
              className="mx-auto mb-3 size-6 text-muted-foreground"
              aria-hidden
            />
            <p className="text-sm font-medium">No outstanding data imported yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload an H&amp;S export above to populate this table.
            </p>
          </div>
        ) : (
          <OutstandingTable rows={rows} />
        )}
      </div>
    </>
  );
}
