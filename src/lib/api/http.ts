import { ApiError } from "@/lib/api/errors";
import type { ApiResponse } from "@/types/api";

/**
 * Browser-side fetch wrapper for this app's own Route Handlers (`/api/*`).
 *
 * It knows nothing about Google Apps Script — that boundary is crossed on the
 * server. It only unwraps the shared `ApiResponse` envelope so callers work
 * with plain data and `try/catch`.
 */

const API_BASE = "/api";

export interface RequestOptions {
  readonly signal?: AbortSignal;
  /** Send this string verbatim as the body instead of JSON. Used for file uploads. */
  readonly rawBody?: string;
  /** Appended as a query string. `undefined` entries are dropped. */
  readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const init: RequestInit = {
    method,
    // Session cookie is httpOnly and same-origin; nothing else is attached.
    credentials: "same-origin",
    cache: "no-store",
  };
  if (options.signal) init.signal = options.signal;
  if (options.rawBody !== undefined) {
    init.headers = { "Content-Type": "text/plain;charset=utf-8" };
    init.body = options.rawBody;
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, options.query), init);

  let parsed: ApiResponse<T>;
  try {
    parsed = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      { code: "UNKNOWN", message: "The server returned an unreadable response." },
      response.status,
    );
  }

  if (!parsed.ok) throw new ApiError(parsed.error, response.status);
  return parsed.data;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
} as const;
