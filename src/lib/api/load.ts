import "server-only";

import { toApiError } from "@/lib/api/errors";
import type { ApiErrorBody } from "@/types/api";

/**
 * Outcome of a server-side data load, as handed to a view component.
 *
 * Server Components use this instead of letting an `ApiError` escape: an
 * unconfigured or unreachable backend should render an honest status panel,
 * not blow up the whole route.
 */
export type LoadResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ApiErrorBody };

export async function load<T>(
  read: () => Promise<T>,
): Promise<LoadResult<T>> {
  try {
    return { ok: true, data: await read() };
  } catch (cause) {
    return { ok: false, error: toApiError(cause).toBody() };
  }
}
