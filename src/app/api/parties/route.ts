import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { listParties } from "@/services/parties.service";
import type { PartyFilters } from "@/types/party";

/**
 * GET /api/parties?salesmanId=&active=&search=
 *
 * The browser's only route to party data. Apps Script credentials stay on the
 * server; nothing about the upstream call is visible to the client.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const active = params.get("active");

    const filters: PartyFilters = {
      ...(params.get("salesmanId")
        ? { salesmanId: params.get("salesmanId") as string }
        : {}),
      ...(params.get("search") ? { search: params.get("search") as string } : {}),
      ...(active === null ? {} : { active: active === "true" }),
    };

    return ok(await listParties(filters));
  } catch (error) {
    return fail(error);
  }
}
