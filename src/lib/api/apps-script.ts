import "server-only";

import { serverEnv } from "@/config/env";
import { ApiError } from "@/lib/api/errors";
import type { ApiAction } from "@/lib/api/actions";
import type { ApiErrorCode, ApiResponse, AppsScriptRequest } from "@/types/api";

/**
 * Server-side transport to the Google Apps Script web app.
 *
 * Why the browser never calls Apps Script directly:
 *  1. The shared `APPS_SCRIPT_API_KEY` would be exposed in the bundle.
 *  2. `/exec` answers cross-origin requests with a 302 to a googleusercontent
 *     host, which drops custom headers and breaks CORS preflight.
 * So the browser talks to Next Route Handlers (`/api/*`), and only those
 * handlers — running on the server — reach Apps Script.
 *
 * This module is `server-only`: importing it from a Client Component is a
 * build-time error rather than a runtime leak.
 */

interface CallOptions {
  /** Identity resolved from the session, forwarded so Apps Script can authorise. */
  readonly actor?: AppsScriptRequest["actor"];
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

/** True when both the endpoint and the shared key are present. */
export function isAppsScriptConfigured(): boolean {
  return Boolean(serverEnv.appsScriptUrl && serverEnv.appsScriptApiKey);
}

/**
 * Posts one `{ action, payload }` envelope to Apps Script and returns the
 * decoded `data`, or throws an `ApiError`.
 */
export async function callAppsScript<TResult, TPayload = unknown>(
  action: ApiAction,
  payload: TPayload,
  options: CallOptions = {},
): Promise<TResult> {
  const url = serverEnv.appsScriptUrl;
  const apiKey = serverEnv.appsScriptApiKey;

  if (!url || !apiKey) {
    throw new ApiError(
      {
        code: "NOT_CONFIGURED",
        message:
          "The Google Apps Script backend is not configured. Set APPS_SCRIPT_URL and APPS_SCRIPT_API_KEY in .env.local.",
      },
      503,
    );
  }

  const body: AppsScriptRequest<TPayload> = options.actor
    ? { action, payload, apiKey, actor: options.actor }
    : { action, payload, apiKey };

  const timeoutMs = options.timeoutMs ?? serverEnv.appsScriptTimeoutMs;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      // Apps Script rejects a preflight; text/plain keeps the request "simple"
      // and the body is still parsed as JSON on the other side.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
      cache: "no-store",
      signal,
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "unknown error";
    throw new ApiError(
      {
        code: "UPSTREAM_ERROR",
        message: `Could not reach the Apps Script backend for "${action}": ${reason}`,
      },
      502,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      {
        code: "UPSTREAM_ERROR",
        message: `Apps Script returned HTTP ${response.status} for "${action}".`,
      },
      502,
    );
  }

  let parsed: ApiResponse<TResult>;
  try {
    parsed = (await response.json()) as ApiResponse<TResult>;
  } catch {
    // Usually means the deployment is private and Google served an HTML login
    // page instead of JSON.
    throw new ApiError(
      {
        code: "UPSTREAM_ERROR",
        message:
          `Apps Script returned a non-JSON response for "${action}". ` +
          `Check that the Web App is deployed with access set to "Anyone".`,
      },
      502,
    );
  }

  if (!parsed.ok) {
    throw new ApiError(parsed.error, statusForCode(parsed.error.code));
  }

  return parsed.data;
}

function statusForCode(code: ApiErrorCode): number {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
    case "MONTH_CLOSED":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
      return 422;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "NOT_CONFIGURED":
      return 503;
    case "NOT_IMPLEMENTED":
      return 501;
    default:
      return 500;
  }
}
