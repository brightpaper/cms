import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { CACHE_TAG } from "@/lib/api/cache";
import { requireApiRole } from "@/lib/auth/api-guard";
import { createUser, listUsers } from "@/services/users.service";
import type { UserRole } from "@/types/user";

/** GET /api/admin/users — every account, without passwords. Admin only. */
export async function GET() {
  try {
    await requireApiRole("admin");
    return ok(await listUsers());
  } catch (error) {
    return fail(error);
  }
}

function readRole(value: unknown): UserRole {
  const role = String(value ?? "").trim().toLowerCase();
  if (role !== "admin" && role !== "salesman") {
    throw new ApiError(
      { code: "VALIDATION_ERROR", message: "Role must be ADMIN or SALESMAN." },
      422,
    );
  }
  return role;
}

/**
 * POST /api/admin/users — creates an account. Admin only.
 *
 * This is not a signup endpoint: it is gated on a verified ADMIN session, and
 * the role is validated here rather than trusted from the body.
 */
export async function POST(request: NextRequest) {
  try {
    await requireApiRole("admin");

    const body = (await request.json().catch(() => null)) as {
      username?: unknown;
      password?: unknown;
      name?: unknown;
      role?: unknown;
      active?: unknown;
    } | null;

    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");
    const name = String(body?.name ?? "").trim();

    if (username === "") {
      throw new ApiError(
        { code: "VALIDATION_ERROR", message: "Username is required." },
        422,
      );
    }
    if (password.length < 6) {
      throw new ApiError(
        {
          code: "VALIDATION_ERROR",
          message: "Password must be at least 6 characters.",
        },
        422,
      );
    }

    const created = await createUser({
      username,
      password,
      name: name === "" ? username : name,
      role: readRole(body?.role),
      active: body?.active !== false,
    });

    revalidateTag(CACHE_TAG.users, { expire: 0 });
    return ok(created, 201);
  } catch (error) {
    return fail(error);
  }
}
