import "server-only";

import { API_ACTIONS } from "@/lib/api/actions";
import { callAppsScript } from "@/lib/api/apps-script";
import { ApiError } from "@/lib/api/errors";
import type { Credentials, SessionUser, UserRole } from "@/types/user";

/**
 * Username + password authentication.
 *
 * Verification happens entirely inside Apps Script: the plaintext password is
 * forwarded once over TLS, compared against the Users sheet inside Apps Script,
 * and only a safe identity projection comes back. The stored password never reaches
 * this process, let alone the browser.
 */

const GENERIC_MESSAGE = "Invalid username or password.";

/** Exactly the shape Apps Script promises for `users.authenticate`. */
interface AuthenticatedUserResponse {
  readonly userId?: unknown;
  readonly username?: unknown;
  readonly name?: unknown;
  readonly role?: unknown;
}

function isRole(value: unknown): value is UserRole {
  return value === "admin" || value === "salesman";
}

/**
 * Authenticates a user, or throws an `ApiError` whose message is always the
 * same generic string — the caller must not be able to tell an unknown
 * username from a wrong password from a disabled account.
 */
export async function authenticate(
  credentials: Credentials,
): Promise<SessionUser> {
  const username = credentials.username.trim().toLowerCase();
  const password = credentials.password;

  if (username === "" || password === "") {
    throw new ApiError({ code: "UNAUTHENTICATED", message: GENERIC_MESSAGE }, 401);
  }

  const raw = await callAppsScript<AuthenticatedUserResponse>(
    API_ACTIONS.users.authenticate,
    { username, password },
  );

  // Never trust the shape of an upstream response: a malformed payload must
  // fail closed rather than produce a half-built session.
  if (
    typeof raw?.userId !== "string" ||
    raw.userId === "" ||
    typeof raw.username !== "string" ||
    !isRole(raw.role)
  ) {
    throw new ApiError(
      { code: "UPSTREAM_ERROR", message: "Sign-in is temporarily unavailable." },
      502,
    );
  }

  return {
    userId: raw.userId,
    username: raw.username,
    name: typeof raw.name === "string" && raw.name !== "" ? raw.name : raw.username,
    role: raw.role,
  };
}

export { GENERIC_MESSAGE as GENERIC_AUTH_MESSAGE };
