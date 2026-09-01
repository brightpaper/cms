import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import { ApiError } from "@/lib/api/errors";
import type { SessionUser, UserRole } from "@/types/user";

/**
 * Role checks for Route Handlers.
 *
 * Unlike `requireRole`, which redirects, these throw an `ApiError` so the
 * handler answers with a JSON 401/403. The role is read from the signed
 * session cookie, never from the request body, query string or a header.
 */

export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(
      { code: "UNAUTHENTICATED", message: "You must be signed in." },
      401,
    );
  }
  return user;
}

export async function requireApiRole(role: UserRole): Promise<SessionUser> {
  const user = await requireApiUser();
  if (user.role !== role) {
    throw new ApiError(
      { code: "FORBIDDEN", message: "You do not have access to this action." },
      403,
    );
  }
  return user;
}
