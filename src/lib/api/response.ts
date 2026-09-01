import { NextResponse } from "next/server";

import { toApiError } from "@/lib/api/errors";
import type { ApiSuccess } from "@/types/api";

/**
 * Helpers for Route Handlers so every `/api/*` endpoint emits the exact same
 * envelope the browser client expects.
 */

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true as const, data }, { status });
}

export function fail(error: unknown): NextResponse {
  const apiError = toApiError(error);
  return NextResponse.json(
    { ok: false as const, error: apiError.toBody() },
    { status: apiError.status },
  );
}
