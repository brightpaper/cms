"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, Search, X } from "lucide-react";

import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OUTSTANDING_PAGE_SIZE } from "@/config/import";
import { outstandingColumns } from "@/features/outstanding/columns";
import type { HnsOutstandingRecord } from "@/types/outstanding";

interface OutstandingTableProps {
  readonly rows: readonly HnsOutstandingRecord[];
}

/**
 * The stored snapshot, paginated in the browser.
 *
 * All rows arrive with the server render — one Apps Script call already costs
 * several seconds, so re-fetching per page would be far worse than slicing an
 * array that is already in memory. Page changes are therefore instant.
 */
export function OutstandingTable({ rows }: OutstandingTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(OUTSTANDING_PAGE_SIZE);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return rows;
    return rows.filter(
      (row) =>
        row.partyName.toLowerCase().includes(needle) ||
        (row.billNo ?? "").toLowerCase().includes(needle) ||
        (row.hnsPartyCode ?? "").toLowerCase().includes(needle),
    );
  }, [rows, query]);

  // Clamp rather than reset: if a filter shrinks the list below the current
  // page, land on the last page that still has rows instead of an empty one.
  const pageCount = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Filter by party, bill no or code"
            aria-label="Filter outstanding rows"
            className="pl-8"
          />
        </div>
        {query ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setQuery("");
              setPage(1);
            }}
            aria-label="Clear filter"
          >
            <X aria-hidden />
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={outstandingColumns}
        rows={visible}
        getRowId={(record, index) =>
          `${record.hnsPartyCode}:${record.billNo ?? "-"}:${(currentPage - 1) * pageSize + index}`
        }
        caption="Imported H&S outstanding records"
        emptyState={
          <EmptyState
            icon={FileSpreadsheet}
            title={query ? "No matching rows" : "No outstanding data imported yet"}
            description={
              query
                ? `Nothing matches "${query}". Clear the filter to see all rows.`
                : "Upload an H&S export above to populate this table."
            }
          />
        }
      />

      <Pagination
        page={currentPage}
        pageSize={pageSize}
        totalItems={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        itemLabel="rows"
      />
    </>
  );
}
