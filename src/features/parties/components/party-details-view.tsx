import { DataTable } from "@/components/common/data-table";
import { IntegrationStatus } from "@/components/common/integration-status";
import { PageHeader } from "@/components/common/page-header";
import { PendingIntegration } from "@/components/common/pending-integration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SHEET_NAMES } from "@/config/constants";
import { API_ACTIONS } from "@/lib/api/actions";
import { collectionColumns } from "@/features/collections/columns";
import { followUpColumns } from "@/features/follow-ups/columns";
import type { LoadResult } from "@/lib/api/load";
import type { Collection } from "@/types/collection";
import type { EntityId } from "@/types/common";
import type { FollowUp } from "@/types/follow-up";
import type { UserRole } from "@/types/user";

interface PartyDetailsViewProps {
  readonly role: UserRole;
  readonly partyId: EntityId;
  readonly collections: LoadResult<readonly Collection[]>;
  readonly followUps: LoadResult<readonly FollowUp[]>;
}

/**
 * One party, with its datasets side by side but never merged: H&S outstanding
 * (not read yet), collections and follow-ups each keep their own sheet.
 */
export function PartyDetailsView({
  role,
  partyId,
  collections,
  followUps,
}: PartyDetailsViewProps) {
  const collectionRows = collections.ok ? collections.data : [];
  const followUpRows = followUps.ok ? followUps.data : [];

  return (
    <>
      <PageHeader
        title="Party details"
        description={
          role === "admin"
            ? `Full collection and follow-up history for party ${partyId}.`
            : `Your collection and follow-up history for party ${partyId}.`
        }
      />

      {collections.ok ? null : <IntegrationStatus error={collections.error} />}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Party profile and salesman assignment load from the{" "}
          <code>{SHEET_NAMES.parties}</code> and{" "}
          <code>{SHEET_NAMES.partyAssignments}</code> tabs via{" "}
          <code>{API_ACTIONS.parties.get}</code>, which is not implemented yet.
        </CardContent>
      </Card>

      <Tabs defaultValue="collections">
        <TabsList>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
          <TabsTrigger value="outstanding">H&amp;S Outstanding</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="mt-4">
          <DataTable
            columns={collectionColumns}
            rows={collectionRows}
            getRowId={(entry) => entry.collectionId}
            caption="Collections for this party"
          />
        </TabsContent>

        <TabsContent value="follow-ups" className="mt-4">
          <DataTable
            columns={followUpColumns}
            rows={followUpRows}
            getRowId={(followUp) => followUp.followUpId}
            caption="Follow-ups for this party"
          />
        </TabsContent>

        <TabsContent value="outstanding" className="mt-4">
          <PendingIntegration actions={[API_ACTIONS.outstanding.list]} />
        </TabsContent>
      </Tabs>
    </>
  );
}
