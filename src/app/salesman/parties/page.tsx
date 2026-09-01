import type { Metadata } from "next";

import { PartiesView } from "@/features/parties/components/parties-view";
import { loadParties } from "@/features/shared/page-data";

export const metadata: Metadata = { title: "My parties" };
export const dynamic = "force-dynamic";

export default async function SalesmanPartiesPage() {
  return <PartiesView role="salesman" parties={await loadParties()} />;
}
