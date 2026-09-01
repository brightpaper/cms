import "server-only";

import { API_ACTIONS } from "@/lib/api/actions";
import { callAppsScript } from "@/lib/api/apps-script";
import { CACHE_TAG, cachedRead } from "@/lib/api/cache";
import { notImplemented } from "@/lib/api/errors";
import type { EntityId, MonthKey } from "@/types/common";
import type { MonthlySummary } from "@/types/report";

/**
 * `reports.availablePeriods` — implemented in Step 2.
 *
 * Returns the `YYYY-MM` keys that actually contain data, newest first, gathered
 * from Collections and FollowUps. An empty database returns `[]`; the list is
 * never generated from the calendar.
 */
export const listAvailablePeriods = cachedRead(
  (salesmanId?: EntityId): Promise<readonly MonthKey[]> =>
    callAppsScript<readonly MonthKey[]>(
      API_ACTIONS.reports.availablePeriods,
      salesmanId ? { salesmanId } : {},
    ),
  [API_ACTIONS.reports.availablePeriods],
  [CACHE_TAG.periods],
);

/* ------------------------- Not implemented yet ---------------------------- */

/** Month-wise aggregation lands in a later step; the sheet only holds structure. */
export function getMonthlySummary(
  monthKey: MonthKey,
  salesmanId?: EntityId,
): Promise<readonly MonthlySummary[]> {
  return notImplemented(API_ACTIONS.reports.monthlySummary, {
    monthKey,
    salesmanId,
  });
}
