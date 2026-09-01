import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { CACHE_TAG } from "@/lib/api/cache";
import { requireApiRole } from "@/lib/auth/api-guard";
import { readUploadedExport } from "@/lib/import/upload";
import { currentDateString } from "@/lib/utils/period";
import { importOutstanding } from "@/services/outstanding.service";

/**
 * POST /api/admin/outstanding/import
 *
 * Admin only. The confirmation step: re-parses the uploaded workbook
 * server-side, refuses outright if anything fails validation, and only then
 * writes the snapshot.
 *
 * The file is re-parsed rather than trusting rows posted back from the browser,
 * so what gets written is always the server's own reading of the upload.
 */
export async function POST(request: NextRequest) {
  try {
    await requireApiRole("admin");

    const { result } = await readUploadedExport(request);

    // All-or-nothing: a single invalid row aborts the whole import, so the
    // sheet never ends up holding a partial snapshot.
    if (result.errors.length > 0) {
      throw new ApiError(
        {
          code: "VALIDATION_ERROR",
          message:
            `The file has ${result.errors.length} validation ` +
            `${result.errors.length === 1 ? "error" : "errors"}. Nothing was imported.`,
        },
        422,
      );
    }
    if (result.rows.length === 0) {
      throw new ApiError(
        {
          code: "VALIDATION_ERROR",
          message:
            "No outstanding rows were found in that file. Nothing was imported.",
        },
        422,
      );
    }

    const outcome = await importOutstanding(result.rows, currentDateString());

    // The snapshot just changed; drop the cached read so the table below
    // reflects the import straight away rather than after the TTL.
    revalidateTag(CACHE_TAG.outstanding, { expire: 0 });

    return ok({
      ...outcome,
      warnings: result.warnings.length,
      parsedBalanceTotal: result.stats.balanceTotal,
      reportedGrandTotal: result.stats.reportedGrandTotal,
    });
  } catch (error) {
    return fail(error);
  }
}
