import type { Metadata } from "next";

import { OutstandingView } from "@/features/outstanding/components/outstanding-view";
import { load } from "@/lib/api/load";
import { listOutstanding } from "@/services/outstanding.service";

export const metadata: Metadata = { title: "H&S outstanding" };
export const dynamic = "force-dynamic";

/**
 * Admin-only: the section layout already requires an admin session, and the
 * import routes re-check the role server-side.
 */
export default async function AdminOutstandingPage() {
  const records = await load(() => listOutstanding());
  return <OutstandingView records={records} />;
}
