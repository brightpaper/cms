import type { Metadata } from "next";

import { PartyDetailsView } from "@/features/parties/components/party-details-view";
import {
  loadPartyCollections,
  loadPartyFollowUps,
} from "@/features/shared/page-data";

export const metadata: Metadata = { title: "Party details" };
export const dynamic = "force-dynamic";

export default async function SalesmanPartyDetailsPage({
  params,
}: PageProps<"/salesman/parties/[partyId]">) {
  const { partyId } = await params;
  const [collections, followUps] = await Promise.all([
    loadPartyCollections(partyId),
    loadPartyFollowUps(partyId),
  ]);

  return (
    <PartyDetailsView
      role="salesman"
      partyId={partyId}
      collections={collections}
      followUps={followUps}
    />
  );
}
