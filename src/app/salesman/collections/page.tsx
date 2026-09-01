import type { Metadata } from "next";

import { CollectionsView } from "@/features/collections/components/collections-view";
import { loadCollections, loadPeriods, readMonthParam } from "@/features/shared/page-data";

export const metadata: Metadata = { title: "Collections" };
export const dynamic = "force-dynamic";

export default async function SalesmanCollectionsPage({
  searchParams,
}: PageProps<"/salesman/collections">) {
  const month = readMonthParam((await searchParams).month);
  const [collections, periods] = await Promise.all([
    loadCollections(month),
    loadPeriods(),
  ]);

  return (
    <CollectionsView
      role="salesman"
      collections={collections}
      periods={periods}
      selectedMonth={month}
    />
  );
}
