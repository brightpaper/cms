import type { ColumnDef } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, humanize } from "@/lib/utils/format";
import type { Collection } from "@/types/collection";

/** Column contract for collection entries. Mirrors the `Collections` sheet. */
export const collectionColumns: readonly ColumnDef<Collection>[] = [
  {
    id: "paymentDate",
    header: "Date",
    cell: (entry) => formatDate(entry.paymentDate),
  },
  {
    id: "monthKey",
    header: "Month",
    cell: (entry) => (
      <Badge variant="outline" className="font-mono text-[0.7rem]">
        {entry.monthKey || "—"}
      </Badge>
    ),
    hideOnMobile: true,
  },
  {
    id: "partyId",
    header: "Party",
    cell: (entry) => (
      <span className="font-mono text-xs">{entry.partyId || "—"}</span>
    ),
  },
  {
    id: "paymentMode",
    header: "Mode",
    cell: (entry) => (entry.paymentMode ? humanize(entry.paymentMode) : "—"),
    hideOnMobile: true,
  },
  {
    id: "referenceNo",
    header: "Reference",
    cell: (entry) => entry.referenceNo ?? "—",
    hideOnMobile: true,
  },
  {
    id: "remark",
    header: "Remark",
    cell: (entry) => (
      <span className="line-clamp-2 max-w-sm">{entry.remark ?? "—"}</span>
    ),
    hideOnMobile: true,
  },
  {
    id: "amount",
    header: "Amount",
    cell: (entry) => formatCurrency(entry.amount),
    align: "end",
  },
];
