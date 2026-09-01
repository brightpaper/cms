import type { ColumnDef } from "@/components/common/data-table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import type { HnsParsedRow } from "@/lib/import/hns-parser";
import type { HnsOutstandingRecord } from "@/types/outstanding";

/**
 * Column contract for imported H&S rows. Mirrors the `HNS_Outstanding` sheet,
 * which is read-only inside this app.
 */
export const outstandingColumns: readonly ColumnDef<HnsOutstandingRecord>[] = [
  {
    id: "partyName",
    header: "Party",
    cell: (record) => <span className="font-medium">{record.partyName}</span>,
  },
  {
    id: "hnsPartyCode",
    header: "H&S Code",
    cell: (record) => (
      <span className="font-mono text-xs">{record.hnsPartyCode}</span>
    ),
    hideOnMobile: true,
  },
  {
    id: "billNo",
    header: "Bill No",
    cell: (record) => record.billNo ?? "—",
    hideOnMobile: true,
  },
  {
    id: "billDate",
    header: "Bill Date",
    cell: (record) => formatDate(record.billDate),
    hideOnMobile: true,
  },
  {
    id: "creditDays",
    header: "Credit Days",
    cell: (record) => formatNumber(record.creditDays),
    align: "end",
    hideOnMobile: true,
  },
  {
    id: "dueDate",
    header: "Due Date",
    cell: (record) => formatDate(record.dueDate),
    hideOnMobile: true,
  },
  {
    id: "billAmount",
    header: "Bill Amount",
    cell: (record) => formatCurrency(record.billAmount),
    align: "end",
    hideOnMobile: true,
  },
  {
    id: "balanceAmount",
    header: "Balance",
    cell: (record) => formatCurrency(record.balanceAmount),
    align: "end",
  },
];

/**
 * Columns for the pre-import preview.
 *
 * Reads a parsed row rather than a stored record: the party code is not known
 * until the server links it, and there is no importDate yet.
 */
export const outstandingPreviewColumns: readonly ColumnDef<HnsParsedRow>[] = [
  {
    id: "partyName",
    header: "Party",
    cell: (row) => <span className="font-medium">{row.partyName}</span>,
  },
  {
    id: "billNo",
    header: "Bill No",
    cell: (row) =>
      row.billNo ? (
        <span className="font-mono text-xs">{row.billNo}</span>
      ) : (
        <span className="text-xs text-muted-foreground italic">none</span>
      ),
  },
  {
    id: "billDate",
    header: "Bill Date",
    cell: (row) => formatDate(row.billDate),
    hideOnMobile: true,
  },
  {
    id: "creditDays",
    header: "Credit Days",
    cell: (row) => formatNumber(row.creditDays),
    align: "end",
    hideOnMobile: true,
  },
  {
    id: "billAmount",
    header: "Bill Amount",
    cell: (row) => formatCurrency(row.billAmount),
    align: "end",
    hideOnMobile: true,
  },
  {
    id: "receivedAmount",
    header: "Received",
    cell: (row) => formatCurrency(row.receivedAmount),
    align: "end",
    hideOnMobile: true,
  },
  {
    id: "dueDate",
    header: "Due Date",
    cell: (row) => formatDate(row.dueDate),
    hideOnMobile: true,
  },
  {
    id: "balanceAmount",
    header: "Balance",
    cell: (row) => (
      // Credits (unadjusted receipts) show as negative in the real export.
      <span className={row.balanceAmount < 0 ? "text-destructive" : undefined}>
        {formatCurrency(row.balanceAmount)}
      </span>
    ),
    align: "end",
  },
];
