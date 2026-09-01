import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { CACHE_TAG } from "@/lib/api/cache";
import { requireApiRole } from "@/lib/auth/api-guard";
import { setUserActive } from "@/services/users.service";

/** POST /api/admin/users/[userId]/active — enable or disable sign-in. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    await requireApiRole("admin");
    const { userId } = await context.params;

    const body = (await request.json().catch(() => null)) as {
      active?: unknown;
    } | null;

    if (typeof body?.active !== "boolean") {
      throw new ApiError(
        { code: "VALIDATION_ERROR", message: "`active` must be true or false." },
        422,
      );
    }

    const updated = await setUserActive(userId, body.active);
    revalidateTag(CACHE_TAG.users, { expire: 0 });
    return ok(updated);
  } catch (error) {
    return fail(error);
  }
}
