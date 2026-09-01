import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ROLE_HOME_ROUTE, ROUTES } from "@/config/routes";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { verifySessionToken } from "@/lib/auth/session";

/**
 * Edge-of-app route protection.
 *
 * Proxy runs on every matched request, so this does the cheap part only:
 * verify the cookie's HMAC signature and expiry locally. No sheet reads, no
 * Apps Script calls. Each protected layout re-checks the session server-side,
 * so this is a fast filter rather than the only line of defence.
 *
 * Proxy runs on the Node.js runtime in Next.js 16, which is why `node:crypto`
 * (via lib/auth/session) is available here.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isSalesmanArea =
    pathname === "/salesman" || pathname.startsWith("/salesman/");
  const isLogin = pathname === ROUTES.login;

  // A signed-in user has no reason to see the login form.
  if (isLogin) {
    return session
      ? NextResponse.redirect(new URL(ROLE_HOME_ROUTE[session.role], request.url))
      : NextResponse.next();
  }

  if (!isAdminArea && !isSalesmanArea) return NextResponse.next();

  // No session, or an invalid/expired one: send to login.
  if (!session) {
    const url = new URL(ROUTES.login, request.url);
    // Remember where they were headed, so login can return them there.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    const response = NextResponse.redirect(url);
    // Drop the stale cookie so the browser stops re-sending it.
    if (token) response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Signed in, wrong area: send to their own home. The role comes from the
  // verified payload, so a URL or body value cannot influence this.
  const allowed = session.role === "admin" ? isAdminArea : isSalesmanArea;
  if (!allowed) {
    return NextResponse.redirect(
      new URL(ROLE_HOME_ROUTE[session.role], request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/salesman", "/salesman/:path*", "/login"],
};
