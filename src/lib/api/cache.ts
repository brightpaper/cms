import "server-only";

import { unstable_cache } from "next/cache";

/**
 * Short-lived server-side caching for Apps Script reads.
 *
 * Every read costs a 2–5 second Apps Script round trip, and the same handful of
 * reads back the whole admin area. Caching them briefly turns repeat navigation
 * from "wait several seconds" into "instant", at the cost of a small staleness
 * window.
 *
 * The trade-off, stated plainly: a row edited **directly in the spreadsheet**
 * can take up to `READ_CACHE_SECONDS` to appear in the app. Writes made through
 * the app do not have that delay — they call `revalidateTag`, so the next read
 * is fresh immediately.
 *
 * A thrown error is never cached, so a misconfigured or unreachable backend
 * retries on the next request rather than being stuck for the whole window.
 */

export const CACHE_TAG = {
  parties: "parties",
  collections: "collections",
  followUps: "follow-ups",
  periods: "periods",
  outstanding: "outstanding",
  users: "users",
} as const;

export type CacheTag = (typeof CACHE_TAG)[keyof typeof CACHE_TAG];

/** How long a read stays warm. Deliberately short. */
export const READ_CACHE_SECONDS = 30;

/**
 * Wraps a read so its result is reused across requests.
 *
 * `keyParts` must uniquely identify the read; arguments are serialised into the
 * key automatically, so a filtered and an unfiltered call cache separately.
 */
export function cachedRead<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>,
  keyParts: readonly string[],
  tags: readonly CacheTag[],
  revalidate: number = READ_CACHE_SECONDS,
): (...args: Args) => Promise<Result> {
  return unstable_cache(read, [...keyParts], {
    tags: [...tags],
    revalidate,
  });
}
