/**
 * Configuration for the H&S outstanding import.
 *
 * These values describe the *actual* export produced by the H&S ERP
 * ("01 DATE AND PARTY WISE OUTSTANDING"), verified against a live file.
 */

/*
 * Column layout is NOT fixed and is deliberately not encoded here.
 *
 * Two real H&S reports were compared and their column orders differ entirely,
 * so the importer resolves columns by header name at parse time. The live
 * source of truth is HEADER_ALIASES / resolveColumns in
 * src/lib/import/hns-parser.ts.
 */

/** The export's "no date" sentinel, written for rows with no document date. */
export const HNS_NULL_DATE = "01-01-1900";

/** Upload guard rails. The observed live export is ~73 KB / 1122 lines. */
export const HNS_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const HNS_MAX_ROWS = 20000;

/** Extensions the importer accepts: the H&S export is uploaded as-is. */
export const HNS_ACCEPTED_EXTENSIONS = [".xls", ".xlsx"] as const;

/** How many rows the preview table shows before truncating. */
export const HNS_PREVIEW_ROWS = 25;

/**
 * Default page size for the stored H&S snapshot on the admin page.
 *
 * The whole snapshot (~400-800 rows) is fetched in one Apps Script call and
 * paginated in the browser, so this only affects how much is drawn at once.
 */
export const OUTSTANDING_PAGE_SIZE = 50;
