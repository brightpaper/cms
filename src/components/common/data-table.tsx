import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Declarative column definition.
 *
 * Each page declares its columns next to its feature code, which doubles as
 * documentation of the sheet columns that page will read.
 */
export interface ColumnDef<TRow> {
  readonly id: string;
  readonly header: string;
  readonly cell: (row: TRow) => ReactNode;
  readonly align?: "start" | "end";
  /** Hide below the `md` breakpoint to keep narrow screens readable. */
  readonly hideOnMobile?: boolean;
  readonly className?: string;
}

interface DataTableProps<TRow> {
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rows: readonly TRow[];
  /** Index is supplied because some datasets (H&S rows) have no unique key. */
  readonly getRowId: (row: TRow, index: number) => string;
  readonly isLoading?: boolean;
  readonly emptyState?: ReactNode;
  readonly caption?: string;
}

/**
 * Generic, presentation-only table. It sorts nothing, filters nothing and
 * fetches nothing — the caller hands it rows that are already final.
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  emptyState,
  caption,
}: DataTableProps<TRow>) {
  const columnClass = (column: ColumnDef<TRow>) =>
    cn(
      column.align === "end" && "text-right tabular-nums",
      column.hideOnMobile && "hidden md:table-cell",
      column.className,
    );

  return (
    <div className="w-full overflow-x-auto rounded-xl border bg-card">
      <Table>
        {caption ? <caption className="sr-only">{caption}</caption> : null}

        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  "text-[0.7rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase",
                  columnClass(column),
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }, (_, index) => (
              <TableRow key={`skeleton-${index}`}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={columnClass(column)}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              {/* TableCell defaults to whitespace-nowrap; the empty state is prose and must wrap. */}
              <TableCell
                colSpan={columns.length}
                className="p-0 whitespace-normal"
              >
                {emptyState ?? (
                  <EmptyState
                    title="No records"
                    description="There is nothing to show for the current selection."
                  />
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow key={getRowId(row, rowIndex)}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={columnClass(column)}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
