import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { ROLE_HOME_ROUTE } from "@/config/routes";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookie";
import { createSessionToken, isSessionConfigured } from "@/lib/auth/session";
import { ApiError, isApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { authenticate, GENERIC_AUTH_MESSAGE } from "@/services/auth.service";

/**
 * POST /api/auth/login
 *
 * Body: { username, password }
 *
 * On success sets the httpOnly session cookie and returns only the identity
 * fields the UI needs. The password is never logged, never echoed back, and
 * never stored anywhere on the client.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSessionConfigured()) {
      throw new ApiError(
        {
          code: "NOT_CONFIGURED",
          message:
            "Sign-in is not configured. Set SESSION_SECRET in .env.local (openssl rand -base64 32).",
        },
        503,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(
        { code: "VALIDATION_ERROR", message: GENERIC_AUTH_MESSAGE },
        400,
      );
    }

    const { username, password } = (body ?? {}) as {
      username?: unknown;
      password?: unknown;
    };

    // A missing field is reported exactly like a wrong password, so the
    // endpoint cannot be probed for valid usernames.
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.trim() === "" ||
      password === ""
    ) {
      throw new ApiError(
        { code: "UNAUTHENTICATED", message: GENERIC_AUTH_MESSAGE },
        401,
      );
    }

    const user = await authenticate({ username, password });
    const token = createSessionToken(user);

    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);

    return ok({ user, redirectTo: ROLE_HOME_ROUTE[user.role] });
  } catch (error) {
    // Collapse every credential-related failure into one generic response so
    // upstream detail (and account existence) never leaks to the browser.
    if (isApiError(error) && error.code === "UNAUTHENTICATED") {
      return fail(
        new ApiError(
          { code: "UNAUTHENTICATED", message: GENERIC_AUTH_MESSAGE },
          401,
        ),
      );
    }
    return fail(error);
  }
}
