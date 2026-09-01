import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { listAvailablePeriods } from "@/services/reports.service";

/**
 * GET /api/reports/periods?salesmanId=
 *
 * Returns the `YYYY-MM` keys that actually contain data, newest first.
 * An empty database returns `[]` — months are never invented.
 */
export async function GET(request: NextRequest) {
  try {
    const salesmanId = request.nextUrl.searchParams.get("salesmanId");
    return ok(await listAvailablePeriods(salesmanId ?? undefined));
  } catch (error) {
    return fail(error);
  }
}
