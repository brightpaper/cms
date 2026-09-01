import "server-only";

import { API_ACTIONS } from "@/lib/api/actions";
import { callAppsScript } from "@/lib/api/apps-script";
import { CACHE_TAG, cachedRead } from "@/lib/api/cache";
import type { HnsParsedRow } from "@/lib/import/hns-parser";
import type { HnsImportResult, HnsOutstandingRecord } from "@/types/outstanding";

/**
 * H&S ERP outstanding data.
 *
 * The only write path is a full snapshot import, which touches the
 * `HNS_Outstanding` tab alone. Collections, FollowUps and MonthlySummary are
 * never modified by an import.
 */

export const listOutstanding = cachedRead(
  (
    filters: { readonly hnsPartyCode?: string; readonly search?: string } = {},
  ): Promise<readonly HnsOutstandingRecord[]> =>
    callAppsScript<readonly HnsOutstandingRecord[]>(
      API_ACTIONS.outstanding.list,
      filters,
    ),
  [API_ACTIONS.outstanding.list],
  [CACHE_TAG.outstanding],
);

/**
 * Replaces the outstanding snapshot.
 *
 * Callers must have validated the rows first: Apps Script re-validates and
 * refuses the whole batch rather than writing a partial snapshot.
 */
export function importOutstanding(
  rows: readonly HnsParsedRow[],
  importDate: string,
): Promise<HnsImportResult> {
  return callAppsScript<HnsImportResult>(API_ACTIONS.outstanding.import, {
    rows,
    importDate,
  });
}
