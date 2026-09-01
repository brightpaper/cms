/**
 * Wire format shared by the Next.js BFF routes and Google Apps Script.
 *
 * Apps Script always responds HTTP 200, so success or failure has to be carried
 * in the body. Every response is this discriminated union — callers narrow on
 * `ok` and get a typed payload or a typed error, never both.
 */

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "MONTH_CLOSED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "NOT_CONFIGURED"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN";

export interface ApiErrorBody {
  readonly code: ApiErrorCode;
  readonly message: string;
  /** Field-level messages for `VALIDATION_ERROR`, keyed by field name. */
  readonly fields?: Readonly<Record<string, string>>;
}

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
}

export interface ApiFailure {
  readonly ok: false;
  readonly error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/**
 * Envelope posted to the Apps Script web app. A single `doPost` entry point
 * dispatches on `action`, which keeps the deployment to one URL.
 */
export interface AppsScriptRequest<TPayload = unknown> {
  readonly action: string;
  readonly payload: TPayload;
  /** Shared secret proving the call came from this app. Server-side only. */
  readonly apiKey: string;
  /** Identity of the caller, resolved from the session before the call. */
  readonly actor?: {
    readonly userId: string;
    readonly role: string;
  };
}
