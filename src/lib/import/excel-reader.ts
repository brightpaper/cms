import "server-only";

import * as XLSX from "xlsx";

import { ApiError } from "@/lib/api/errors";

/**
 * Reads an H&S Excel export into a grid of plain strings.
 *
 * SheetJS is used only here, and only server-side: the workbook is parsed
 * inside an admin-authenticated Route Handler, never in the browser.
 *
 * Every cell is flattened to the same textual form the CSV export produces, so
 * the row-classification and validation logic downstream is shared by both
 * paths and needs no knowledge of Excel.
 */

/** Magic bytes that identify the two accepted container formats. */
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy .xls
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // .xlsx (a zip container)

export type ExcelFormat = "xls" | "xlsx";

/**
 * Identifies the workbook format from its leading bytes.
 *
 * Content is sniffed rather than trusting the file extension, so a mislabelled
 * or hand-renamed file is rejected instead of half-parsed.
 */
export function detectExcelFormat(bytes: Uint8Array): ExcelFormat | null {
  const startsWith = (signature: readonly number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith(OLE2_SIGNATURE)) return "xls";
  if (startsWith(ZIP_SIGNATURE)) return "xlsx";
  return null;
}

/**
 * Formats a spreadsheet date as `DD-MM-YYYY`, matching the CSV export.
 *
 * Uses the local date components on purpose. SheetJS builds Date objects in the
 * runtime's local zone, so `toISOString()` would re-interpret them as UTC and
 * shift every date back a day in any zone east of Greenwich — silently turning
 * 12-06-2026 into 11-06-2026 on this machine.
 */
function formatSheetDate(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(value.getDate())}-${pad(value.getMonth() + 1)}-${value.getFullYear()}`;
}

/** Flattens one cell to the text form the shared parser expects. */
function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatSheetDate(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value).trim();
}

/**
 * Parses an uploaded workbook and returns the first worksheet as a string grid.
 *
 * @throws {ApiError} when the bytes are not a readable .xls/.xlsx workbook
 */
export function readExcelGrid(bytes: Uint8Array): {
  readonly rows: string[][];
  readonly sheetName: string;
  readonly format: ExcelFormat;
} {
  const format = detectExcelFormat(bytes);
  if (format === null) {
    throw new ApiError(
      {
        code: "VALIDATION_ERROR",
        message:
          "That file is not an Excel workbook. Upload the .xls or .xlsx exported from H&S.",
      },
      415,
    );
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: true,
      // Formulas, styles and VBA are irrelevant here; skipping them keeps the
      // parse narrow and avoids touching macro content in a legacy .xls.
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      bookVBA: false,
      dense: false,
    });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "unknown error";
    throw new ApiError(
      {
        code: "VALIDATION_ERROR",
        message: `That workbook could not be read: ${reason}`,
      },
      422,
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ApiError(
      { code: "VALIDATION_ERROR", message: "The workbook has no worksheets." },
      422,
    );
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new ApiError(
      { code: "VALIDATION_ERROR", message: "The first worksheet is empty." },
      422,
    );
  }

  // `header: 1` yields positional arrays, which is what the report needs:
  // its own header row cannot be used as object keys (one column is unnamed,
  // and the first header is offset from its data).
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: true,
    defval: null,
  });

  const rows = raw.map((row) =>
    Array.isArray(row) ? row.map(cellToText) : [],
  );

  return { rows, sheetName, format };
}
