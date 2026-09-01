import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROLE_HOME_ROUTE, ROUTES } from "@/config/routes";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { toSessionUser, verifySessionToken } from "@/lib/auth/session";
import type { SessionUser, UserRole } from "@/types/user";

/**
 * The authenticated user for this request, or `null`.
 *
 * The role comes from the *verified* session payload — never from a query
 * string, request body, header, or anything else the client controls.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  return payload ? toSessionUser(payload) : null;
}

/**
 * Requires a session, redirecting to /login otherwise.
 * @returns the authenticated user
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.login);
  return user;
}

/**
 * Requires a session **with a specific role**.
 *
 * A signed-in user of the wrong role is sent to their own home rather than to
 * /login, which would otherwise bounce them straight back and loop.
 */
export async function requireRole(role: UserRole): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(ROLE_HOME_ROUTE[user.role]);
  return user;
}
