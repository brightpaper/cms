import "server-only";

import { API_ACTIONS } from "@/lib/api/actions";
import { callAppsScript } from "@/lib/api/apps-script";
import { CACHE_TAG, cachedRead } from "@/lib/api/cache";
import { notImplemented } from "@/lib/api/errors";
import type { EntityId } from "@/types/common";
import type { Party, PartyAssignment, PartyFilters } from "@/types/party";

/** `parties.list` — implemented in Step 2. Returns [] when the sheet is empty. */
export const listParties = cachedRead(
  (filters: PartyFilters = {}): Promise<readonly Party[]> =>
    callAppsScript<readonly Party[]>(API_ACTIONS.parties.list, filters),
  [API_ACTIONS.parties.list],
  [CACHE_TAG.parties],
);

/* ------------------------- Not implemented yet ---------------------------- */

export function getParty(partyId: EntityId): Promise<Party> {
  return notImplemented(API_ACTIONS.parties.get, { partyId });
}

export function listAssignments(
  salesmanId?: EntityId,
): Promise<readonly PartyAssignment[]> {
  return notImplemented(API_ACTIONS.parties.listAssignments, { salesmanId });
}
