import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { listFollowUps } from "@/services/follow-ups.service";
import type { FollowUpFilters } from "@/types/follow-up";

/**
 * GET /api/follow-ups?monthKey=&partyId=&salesmanId=&status=
 *
 * `monthKey` is matched against the month of `followUpDate` by the backend.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const filters: FollowUpFilters = {
      ...(params.get("monthKey")
        ? { monthKey: params.get("monthKey") as string }
        : {}),
      ...(params.get("partyId")
        ? { partyId: params.get("partyId") as string }
        : {}),
      ...(params.get("salesmanId")
        ? { salesmanId: params.get("salesmanId") as string }
        : {}),
      ...(params.get("status") ? { status: params.get("status") as string } : {}),
    };

    return ok(await listFollowUps(filters));
  } catch (error) {
    return fail(error);
  }
}
