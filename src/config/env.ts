/**
 * Central, typed access to environment variables.
 *
 * Rules:
 * - `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time,
 *   so they must be referenced as full literals (never `process.env[key]`).
 * - Anything secret (the Apps Script shared key, session secret) is read only
 *   in server code and must NOT carry the `NEXT_PUBLIC_` prefix.
 */

export type AppEnvironment = "development" | "staging" | "production";

/** Values that are safe to ship to the browser. */
export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Bright Paper CMS",
  appEnv: (process.env.NEXT_PUBLIC_APP_ENV ?? "development") as AppEnvironment,
} as const;

/**
 * Server-only values. Reading these from a Client Component returns `undefined`,
 * which is why every consumer must live behind a Route Handler / Server Action.
 */
export const serverEnv = {
  /** Deployed Google Apps Script web app URL (`.../exec`). */
  appsScriptUrl: process.env.APPS_SCRIPT_URL,
  /** Shared secret sent to Apps Script so only this app can call it. */
  appsScriptApiKey: process.env.APPS_SCRIPT_API_KEY,
  /** Secret used to sign the session cookie (Step 3). */
  sessionSecret: process.env.SESSION_SECRET,
  /**
   * Request timeout for Apps Script calls, in milliseconds.
   *
   * Apps Script is slow: a few seconds for a small read, more for a large
   * sheet under load. 30s leaves headroom without hanging a page forever.
   */
  appsScriptTimeoutMs: Number(process.env.APPS_SCRIPT_TIMEOUT_MS ?? 30000),
} as const;

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(
      `Missing required environment variable "${name}". ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
    this.name = "MissingEnvError";
  }
}

/** Throws a descriptive error instead of silently sending `undefined` upstream. */
export function requireEnv(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new MissingEnvError(name);
  }
  return value;
}

export const isProduction = publicEnv.appEnv === "production";
