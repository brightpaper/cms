import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { listCollections } from "@/services/collections.service";
import type { CollectionFilters } from "@/types/collection";

/**
 * GET /api/collections?monthKey=&partyId=&salesmanId=
 *
 * Omitting `monthKey` returns every month — historical rows are always
 * readable, and are never modified by a read.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const filters: CollectionFilters = {
      ...(params.get("monthKey")
        ? { monthKey: params.get("monthKey") as string }
        : {}),
      ...(params.get("partyId")
        ? { partyId: params.get("partyId") as string }
        : {}),
      ...(params.get("salesmanId")
        ? { salesmanId: params.get("salesmanId") as string }
        : {}),
    };

    return ok(await listCollections(filters));
  } catch (error) {
    return fail(error);
  }
}
