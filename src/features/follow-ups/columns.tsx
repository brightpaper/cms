import type { ColumnDef } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, humanize } from "@/lib/utils/format";
import type { FollowUp } from "@/types/follow-up";

/** Column contract for follow-ups. Mirrors the `FollowUps` sheet. */
export const followUpColumns: readonly ColumnDef<FollowUp>[] = [
  {
    id: "followUpDate",
    header: "Date",
    cell: (followUp) => formatDate(followUp.followUpDate),
  },
  {
    id: "partyId",
    header: "Party",
    cell: (followUp) => (
      <span className="font-mono text-xs">{followUp.partyId || "—"}</span>
    ),
  },
  {
    id: "salesmanId",
    header: "Salesman",
    cell: (followUp) => (
      <span className="font-mono text-xs">{followUp.salesmanId || "—"}</span>
    ),
    hideOnMobile: true,
  },
  {
    id: "remark",
    header: "Remark",
    cell: (followUp) => (
      <span className="line-clamp-2 max-w-md">{followUp.remark ?? "—"}</span>
    ),
    hideOnMobile: true,
  },
  {
    id: "status",
    header: "Status",
    cell: (followUp) =>
      followUp.status ? (
        <Badge variant="outline">{humanize(followUp.status)}</Badge>
      ) : (
        "—"
      ),
  },
  {
    id: "nextFollowUpDate",
    header: "Next Follow-up",
    cell: (followUp) => formatDate(followUp.nextFollowUpDate),
    align: "end",
  },
];
