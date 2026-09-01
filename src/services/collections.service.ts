import "server-only";

import { API_ACTIONS } from "@/lib/api/actions";
import { callAppsScript } from "@/lib/api/apps-script";
import { CACHE_TAG, cachedRead } from "@/lib/api/cache";
import { notImplemented } from "@/lib/api/errors";
import type { Collection, CollectionFilters } from "@/types/collection";
import type { EntityId } from "@/types/common";

/**
 * `collections.list` — implemented in Step 2.
 *
 * Rows are returned with the `monthKey` they were written with. Filtering by
 * month is what makes historical data browsable; no row is ever rewritten to
 * move it between months.
 */
export const listCollections = cachedRead(
  (filters: CollectionFilters = {}): Promise<readonly Collection[]> =>
    callAppsScript<readonly Collection[]>(API_ACTIONS.collections.list, filters),
  [API_ACTIONS.collections.list],
  [CACHE_TAG.collections],
);

/* ------------------------- Not implemented yet ---------------------------- */

export function getCollection(id: EntityId): Promise<Collection> {
  return notImplemented(API_ACTIONS.collections.get, { id });
}
