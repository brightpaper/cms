import "server-only";

import { load, type LoadResult } from "@/lib/api/load";
import { listCollections } from "@/services/collections.service";
import { listFollowUps } from "@/services/follow-ups.service";
import { listParties } from "@/services/parties.service";
import { listAvailablePeriods } from "@/services/reports.service";
import { isMonthKey } from "@/lib/utils/period";
import type { MonthKey } from "@/types/common";

/**
 * Page-level data loading, shared by the admin and salesman route trees.
 *
 * Every loader goes through `load()`, so a missing configuration or an Apps
 * Script failure becomes a rendered status panel rather than a crashed route.
 */

/** Reads and validates `?month=` from a page's search params. */
export function readMonthParam(
  value: string | string[] | undefined,
): MonthKey | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && isMonthKey(raw) ? raw : undefined;
}

export function loadPeriods(): Promise<LoadResult<readonly MonthKey[]>> {
  return load(() => listAvailablePeriods());
}

export function loadParties() {
  return load(() => listParties());
}

export function loadPartyCount(): Promise<LoadResult<number>> {
  return load(async () => (await listParties()).length);
}

export function loadCollections(monthKey: MonthKey | undefined) {
  return load(() => listCollections(monthKey ? { monthKey } : {}));
}

export function loadFollowUps(monthKey: MonthKey | undefined) {
  return load(() => listFollowUps(monthKey ? { monthKey } : {}));
}

export function loadPartyCollections(partyId: string) {
  return load(() => listCollections({ partyId }));
}

export function loadPartyFollowUps(partyId: string) {
  return load(() => listFollowUps({ partyId }));
}
