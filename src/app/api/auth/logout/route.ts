import { cookies } from "next/headers";

import {
  clearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/cookie";
import { fail, ok } from "@/lib/api/response";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Because sessions are stateless, expiring the
 * cookie is what ends the session for this browser.
 *
 * Note the trade-off: a token that was copied elsewhere before logout stays
 * valid until `expiresAt`. Immediate global revocation would need a server-side
 * denylist, which is deliberately out of scope for this step.
 */
export async function POST() {
  try {
    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, "", clearedSessionCookieOptions);
    return ok({ signedOut: true });
  } catch (error) {
    return fail(error);
  }
}
