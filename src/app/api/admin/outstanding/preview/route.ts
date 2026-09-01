import type { NextRequest } from "next/server";

import { HNS_PREVIEW_ROWS } from "@/config/import";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { requireApiRole } from "@/lib/auth/api-guard";
import { normalizePartyName } from "@/lib/import/hns-parser";
import { readUploadedExport } from "@/lib/import/upload";
import { listParties } from "@/services/parties.service";

/**
 * POST /api/admin/outstanding/preview
 *
 * Admin only. Parses and validates an uploaded H&S workbook and reports what
 * *would* happen. **Writes nothing** — the sheet is only touched by the
 * separate /import route, after the admin confirms.
 */
export async function POST(request: NextRequest) {
  try {
    await requireApiRole("admin");

    const { fileName, result, format, sheetName } =
      await readUploadedExport(request);

    // Resolve party links so the admin sees unmatched parties *before*
    // importing. Matching is by name: the H&S export carries no party code.
    let unmatchedParties: string[] = [];
    let matchedParties = 0;
    let partyLookupFailed: string | null = null;

    const exportParties = [...new Set(result.rows.map((row) => row.partyName))];

    try {
      const parties = await listParties();
      const known = new Set(
        parties.map((party) => normalizePartyName(party.partyName).toUpperCase()),
      );
      for (const name of exportParties) {
        if (known.has(normalizePartyName(name).toUpperCase())) matchedParties++;
        else unmatchedParties.push(name);
      }
    } catch (cause) {
      // A party-lookup failure must not block the preview; it only means the
      // matched/unmatched breakdown is unavailable.
      partyLookupFailed =
        cause instanceof ApiError
          ? cause.message
          : "Could not read the Parties sheet.";
      unmatchedParties = [];
    }

    return ok({
      fileName,
      format,
      sheetName,
      stats: result.stats,
      errors: result.errors,
      warnings: result.warnings,
      preview: result.rows.slice(0, HNS_PREVIEW_ROWS),
      canImport: result.errors.length === 0 && result.rows.length > 0,
      partyLinking: {
        exportParties: exportParties.length,
        matchedParties,
        unmatchedParties,
        failed: partyLookupFailed,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
