import "server-only";

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { serverEnv } from "@/config/env";
import type { SessionUser, UserRole } from "@/types/user";

/**
 * Stateless signed sessions.
 *
 * Format: `v1.<base64url(payload JSON)>.<base64url(HMAC-SHA256)>`
 *
 * The signature covers `v1.<payload>`, so neither the payload nor the version
 * prefix can be swapped without invalidating it. Nothing is encrypted — the
 * payload is readable by anyone holding the cookie — so it carries only
 * identity fields the user already knows about themselves. It is *signed*,
 * which is what stops a client from editing their own role.
 *
 * No session row is written to Google Sheets: verification is a single local
 * HMAC, which keeps every request cheap.
 */

const VERSION = "v1";

/** How long a session stays valid. One working day. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export const SESSION_COOKIE_NAME = "bp_session";

export interface SessionPayload {
  readonly userId: string;
  readonly username: string;
  readonly name: string;
  readonly role: UserRole;
  /** Unix seconds. */
  readonly issuedAt: number;
  /** Unix seconds. */
  readonly expiresAt: number;
}

/** Thrown at startup rather than silently signing with a weak/absent secret. */
export class SessionSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionSecretError";
  }
}

function getSecret(): string {
  const secret = serverEnv.sessionSecret;
  if (!secret || secret.trim() === "") {
    throw new SessionSecretError(
      "SESSION_SECRET is not set. Generate one with: openssl rand -base64 32",
    );
  }
  // 32 bytes base64 is 44 chars; anything much shorter is not worth signing with.
  if (secret.length < 32) {
    throw new SessionSecretError(
      "SESSION_SECRET is too short. Use at least 32 characters (openssl rand -base64 32).",
    );
  }
  return secret;
}

/** True when a usable secret is configured, without throwing. */
export function isSessionConfigured(): boolean {
  try {
    getSecret();
    return true;
  } catch {
    return false;
  }
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input as never).toString("base64url");

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

/**
 * Builds a signed token for an authenticated user.
 * The caller must have verified the password already.
 */
export function createSessionToken(
  user: SessionUser,
  now: number = Math.floor(Date.now() / 1000),
): string {
  const payload: SessionPayload = {
    userId: user.userId,
    username: user.username,
    name: user.name,
    role: user.role,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS,
  };

  const body = `${VERSION}.${b64url(JSON.stringify(payload))}`;
  return `${body}.${sign(body)}`;
}

/**
 * Verifies signature and expiry, returning the payload or `null`.
 *
 * Every failure path returns `null` — a malformed cookie is simply an
 * unauthenticated request, never a 500.
 */
export function verifySessionToken(
  token: string | undefined | null,
  now: number = Math.floor(Date.now() / 1000),
): SessionPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [version, encodedPayload, signature] = parts as [string, string, string];
  if (version !== VERSION) return null;

  const body = `${version}.${encodedPayload}`;

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    // Secret missing or too weak: refuse rather than accept anything.
    return null;
  }

  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length) return null;
  if (!timingSafeEqual(given, want)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;
  } catch {
    return null;
  }

  if (
    typeof payload?.userId !== "string" ||
    typeof payload?.username !== "string" ||
    typeof payload?.expiresAt !== "number" ||
    (payload.role !== "admin" && payload.role !== "salesman")
  ) {
    return null;
  }

  if (payload.expiresAt <= now) return null;

  return payload;
}

/** Narrows a verified payload to the shape the UI consumes. */
export function toSessionUser(payload: SessionPayload): SessionUser {
  return {
    userId: payload.userId,
    username: payload.username,
    name: payload.name,
    role: payload.role,
  };
}

/** Helper for generating a secret, used by documentation and tooling. */
export function generateSessionSecret(): string {
  return randomBytes(32).toString("base64");
}
