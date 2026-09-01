import type { ApiErrorBody, ApiErrorCode } from "@/types/api";

/** Error type every layer of the app throws and catches. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly fields: Readonly<Record<string, string>> | undefined;
  readonly status: number;

  constructor(body: ApiErrorBody, status = 500) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.fields = body.fields;
    this.status = status;
  }

  toBody(): ApiErrorBody {
    return this.fields
      ? { code: this.code, message: this.message, fields: this.fields }
      : { code: this.code, message: this.message };
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Marks a contract that is defined but not wired to Apps Script yet.
 *
 * Every service function currently ends here. Replacing these calls with a real
 * `callAppsScript(...)` is the whole of the backend work — the signatures and
 * types around them do not change.
 */
export function notImplemented(action: string, payload?: unknown): never {
  void payload;
  throw new ApiError(
    {
      code: "NOT_IMPLEMENTED",
      message: `Action "${action}" is not wired to the Google Apps Script backend yet.`,
    },
    501,
  );
}

/** Normalises anything thrown into an `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  return new ApiError({ code: "UNKNOWN", message });
}
