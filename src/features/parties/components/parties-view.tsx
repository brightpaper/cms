import { Building2 } from "lucide-react";

import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { IntegrationStatus } from "@/components/common/integration-status";
import { PageHeader } from "@/components/common/page-header";
import { buildPartyColumns } from "@/features/parties/columns";
import type { LoadResult } from "@/lib/api/load";
import type { Party } from "@/types/party";
import type { UserRole } from "@/types/user";

interface PartiesViewProps {
  readonly role: UserRole;
  readonly parties: LoadResult<readonly Party[]>;
}

export function PartiesView({ role, parties }: PartiesViewProps) {
  const isAdmin = role === "admin";
  const rows = parties.ok ? parties.data : [];

  return (
    <>
      <PageHeader
        title={isAdmin ? "Parties" : "My Parties"}
        description={
          isAdmin
            ? "Every party in the master list, read live from the Parties sheet."
            : "Parties assigned to you. Scoping by salesman arrives with authentication."
        }
      />

      {parties.ok ? null : <IntegrationStatus error={parties.error} />}

      <DataTable
        columns={buildPartyColumns(role)}
        rows={rows}
        getRowId={(party) => party.partyId}
        caption="Parties"
        emptyState={
          <EmptyState
            icon={Building2}
            title="No parties yet"
            description="Add rows to the Parties tab of the spreadsheet and they will appear here."
          />
        }
      />
    </>
  );
}
