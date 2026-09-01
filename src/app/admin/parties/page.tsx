import type { Metadata } from "next";

import { PartiesView } from "@/features/parties/components/parties-view";
import { loadParties } from "@/features/shared/page-data";

export const metadata: Metadata = { title: "Parties" };
export const dynamic = "force-dynamic";

export default async function AdminPartiesPage() {
  return <PartiesView role="admin" parties={await loadParties()} />;
}
