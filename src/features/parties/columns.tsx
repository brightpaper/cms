import Link from "next/link";

import type { ColumnDef } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import type { Party } from "@/types/party";
import type { UserRole } from "@/types/user";

/** Column contract for the parties table. Mirrors the `Parties` sheet. */
export function buildPartyColumns(role: UserRole): readonly ColumnDef<Party>[] {
  const detailsHref =
    role === "admin" ? ROUTES.admin.partyDetails : ROUTES.salesman.partyDetails;

  return [
    {
      id: "partyName",
      header: "Party",
      cell: (party) => (
        <Link
          href={detailsHref(party.partyId)}
          className="font-medium underline-offset-4 hover:underline"
        >
          {party.partyName}
        </Link>
      ),
    },
    {
      id: "hnsPartyCode",
      header: "H&S Code",
      cell: (party) => (
        <span className="font-mono text-xs text-muted-foreground">
          {party.hnsPartyCode || "—"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      id: "city",
      header: "City",
      cell: (party) => party.city ?? "—",
      hideOnMobile: true,
    },
    {
      id: "phone",
      header: "Phone",
      cell: (party) => party.phone ?? "—",
      hideOnMobile: true,
    },
    {
      id: "address",
      header: "Address",
      cell: (party) => (
        <span className="line-clamp-1 max-w-xs">{party.address ?? "—"}</span>
      ),
      hideOnMobile: true,
    },
    {
      id: "active",
      header: "Status",
      cell: (party) => (
        <Badge variant={party.active ? "secondary" : "outline"}>
          {party.active ? "Active" : "Inactive"}
        </Badge>
      ),
      align: "end",
    },
  ];
}
