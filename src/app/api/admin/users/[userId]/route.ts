import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { CACHE_TAG } from "@/lib/api/cache";
import { requireApiRole } from "@/lib/auth/api-guard";
import { updateUser } from "@/services/users.service";
import type { UpdateUserInput, UserRole } from "@/types/user";

/**
 * PATCH /api/admin/users/[userId] — edits name, username, role, password.
 *
 * Only the keys present in the body are changed. `password` is write-only:
 * supplying it sets a new password, and no response ever returns one.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    await requireApiRole("admin");
    const { userId } = await context.params;

    const body = (await request.json().catch(() => null)) as {
      username?: unknown;
      name?: unknown;
      role?: unknown;
      password?: unknown;
    } | null;

    const input: UpdateUserInput = { userId };
    const patch: {
      username?: string;
      name?: string;
      role?: UserRole;
      password?: string;
    } = {};

    if (typeof body?.username === "string" && body.username.trim() !== "") {
      patch.username = body.username.trim();
    }
    if (typeof body?.name === "string") {
      patch.name = body.name.trim();
    }
    if (body?.role !== undefined) {
      const role = String(body.role).trim().toLowerCase();
      if (role !== "admin" && role !== "salesman") {
        throw new ApiError(
          { code: "VALIDATION_ERROR", message: "Role must be ADMIN or SALESMAN." },
          422,
        );
      }
      patch.role = role;
    }
    if (typeof body?.password === "string" && body.password !== "") {
      if (body.password.length < 6) {
        throw new ApiError(
          {
            code: "VALIDATION_ERROR",
            message: "Password must be at least 6 characters.",
          },
          422,
        );
      }
      patch.password = body.password;
    }

    if (Object.keys(patch).length === 0) {
      throw new ApiError(
        { code: "VALIDATION_ERROR", message: "Nothing to update." },
        422,
      );
    }

    const updated = await updateUser({ ...input, ...patch });
    revalidateTag(CACHE_TAG.users, { expire: 0 });
    return ok(updated);
  } catch (error) {
    return fail(error);
  }
}
