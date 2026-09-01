import "server-only";

import { isProduction } from "@/config/env";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/auth/session";

/**
 * Session cookie configuration, in one place so the login and logout routes
 * cannot drift apart.
 *
 * - `httpOnly` keeps it out of `document.cookie`, so no client script (or XSS
 *   payload) can read the session. This is also why nothing is stored in
 *   localStorage or sessionStorage.
 * - `sameSite: "lax"` blocks the cookie on cross-site POSTs while still
 *   allowing normal top-level navigation into the app.
 * - `secure` in production only, so http://localhost still works in dev.
 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
} as const;

/** Same attributes, zero lifetime — what logout sets to clear the cookie. */
export const clearedSessionCookieOptions = {
  ...sessionCookieOptions,
  maxAge: 0,
} as const;

export { SESSION_COOKIE_NAME };
