"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/format";

interface PaginationProps {
  /** 1-based. */
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange?: (pageSize: number) => void;
  readonly pageSizeOptions?: readonly number[];
  /** Noun for the count label, e.g. "rows" or "parties". */
  readonly itemLabel?: string;
}

/**
 * Page numbers to render, with `null` marking a gap.
 *
 * Always shows the first and last page plus a window around the current one, so
 * the control stays a fixed width whether there are 5 pages or 500.
 */
export function paginationRange(
  page: number,
  pageCount: number,
  siblings = 1,
): readonly (number | null)[] {
  // first + last + current + siblings on each side + two gap markers
  const slots = siblings * 2 + 5;
  const span = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, index) => from + index);

  if (pageCount <= slots) return span(1, pageCount);

  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, pageCount);
  const showLeftGap = left > 2;
  const showRightGap = right < pageCount - 1;
  // Length of the contiguous block shown when only one gap is needed. Keeping
  // it fixed is what stops the control resizing as you page through.
  const block = siblings * 2 + 3;

  if (!showLeftGap && showRightGap) return [...span(1, block), null, pageCount];
  if (showLeftGap && !showRightGap) {
    return [1, null, ...span(pageCount - block + 1, pageCount)];
  }
  return [1, null, ...span(left, right), null, pageCount];
}

/**
 * Pagination for a client-side table.
 *
 * The rows are already in memory — every screen here pays a two-to-five second
 * Apps Script round trip for its data, so slicing locally makes page changes
 * instant rather than re-fetching.
 */
export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  itemLabel = "rows",
}: PaginationProps) {
  const pageCount = Math.max(Math.ceil(totalItems / pageSize), 1);
  const current = Math.min(Math.max(page, 1), pageCount);
  const first = totalItems === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(current * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground">{formatNumber(first)}</span>
        –<span className="font-medium text-foreground">{formatNumber(last)}</span> of{" "}
        <span className="font-medium text-foreground">{formatNumber(totalItems)}</span>{" "}
        {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-28" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(current - 1)}
            disabled={current <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden />
          </Button>

          {paginationRange(current, pageCount).map((entry, index) =>
            entry === null ? (
              <span
                key={`gap-${index}`}
                aria-hidden
                className="px-1 text-sm text-muted-foreground select-none"
              >
                …
              </span>
            ) : (
              <Button
                key={entry}
                variant={entry === current ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => onPageChange(entry)}
                aria-label={`Page ${entry}`}
                aria-current={entry === current ? "page" : undefined}
                className={cn("tabular-nums", entry === current && "pointer-events-none")}
              >
                {entry}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(current + 1)}
            disabled={current >= pageCount}
            aria-label="Next page"
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
    </nav>
  );
}
