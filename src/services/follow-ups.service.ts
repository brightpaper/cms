import "server-only";

import { API_ACTIONS } from "@/lib/api/actions";
import { callAppsScript } from "@/lib/api/apps-script";
import { CACHE_TAG, cachedRead } from "@/lib/api/cache";
import { notImplemented } from "@/lib/api/errors";
import type { DateString, EntityId } from "@/types/common";
import type { FollowUp, FollowUpFilters } from "@/types/follow-up";

/**
 * `followUps.list` — implemented in Step 2.
 *
 * `monthKey` is derived by the backend from `followUpDate`; the FollowUps sheet
 * has no month column of its own.
 */
export const listFollowUps = cachedRead(
  (filters: FollowUpFilters = {}): Promise<readonly FollowUp[]> =>
    callAppsScript<readonly FollowUp[]>(API_ACTIONS.followUps.list, filters),
  [API_ACTIONS.followUps.list],
  [CACHE_TAG.followUps],
);

/* ------------------------- Not implemented yet ---------------------------- */

export function listDueFollowUps(
  dueOn: DateString,
  salesmanId?: EntityId,
): Promise<readonly FollowUp[]> {
  return notImplemented(API_ACTIONS.followUps.due, { dueOn, salesmanId });
}
