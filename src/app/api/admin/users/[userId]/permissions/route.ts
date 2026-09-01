import type { NextRequest } from "next/server";

import { PERMISSION_FLAGS } from "@/config/constants";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { requireApiRole } from "@/lib/auth/api-guard";
import { getPermissions, updatePermissions } from "@/services/users.service";
import type { PermissionFlagValues } from "@/types/permission";

/** GET /api/admin/users/[userId]/permissions — the stored flags. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    await requireApiRole("admin");
    const { userId } = await context.params;
    return ok(await getPermissions(userId));
  } catch (error) {
    return fail(error);
  }
}

/**
 * PUT /api/admin/users/[userId]/permissions — writes the flags.
 *
 * Only the known flag names are forwarded, so an unexpected key in the body
 * cannot reach the sheet.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    await requireApiRole("admin");
    const { userId } = await context.params;

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body || typeof body !== "object") {
      throw new ApiError(
        { code: "VALIDATION_ERROR", message: "A permissions object is required." },
        422,
      );
    }

    const flags = Object.fromEntries(
      PERMISSION_FLAGS.map((flag) => [flag, body[flag] === true]),
    ) as PermissionFlagValues;

    return ok(await updatePermissions(userId, flags));
  } catch (error) {
    return fail(error);
  }
}
