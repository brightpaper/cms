import { PageSkeleton } from "@/components/common/page-skeleton";

/**
 * Shown immediately on navigation within this section.
 *
 * It lives inside the section layout, so the AppShell (sidebar, top bar) is
 * kept and only the content area swaps. Without this boundary Next blocks the
 * whole navigation until the Apps Script round trip finishes — two to three
 * seconds during which the browser still shows the previous page.
 */
export default function Loading() {
  return <PageSkeleton />;
}
