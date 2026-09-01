import { HNS_MAX_ROWS, HNS_NULL_DATE } from "@/config/import";
import type { HnsOutstandingRecord } from "@/types/outstanding";

/**
 * Parser for the H&S "DATE AND PARTY WISE OUTSTANDING" export.
 *
 * The export is a *report*, not a table. Verified against two live workbooks:
 *
 *   row 1                     title            "01 DATE AND PARTY  WISE OUTSTANDING"
 *   row 2                     column headers   bill,,crdays,bill_dat,billamt,...
 *   "A H PACKING"             party header     name in column 1, rest blank
 *   ",D000350,30,12-06-2026," bill row         column 1 blank
 *   ",,,,967300,,46718,920582" party subtotal  no bill number, no bill date
 *   (final row)               grand total
 *
 * Quirks handled, all observed in real data:
 *  - The party name is a *group header*, not a column on each row.
 *  - Column layouts differ between H&S reports, so columns are located by
 *    header name rather than by position (see `resolveColumns`).
 *  - 21 of 809 detail rows have a blank bill number (opening balances).
 *  - Bill numbers repeat: three parties carry two "NEFT" rows each, identical
 *    but for the amounts. Rows are therefore NOT uniquely keyable.
 *  - `01-01-1900` is a null-date sentinel, not a real date.
 *  - Balances can be negative (credits, typically unadjusted receipts).
 *  - CSV subtotals use Indian digit grouping ("9,67,300.00") and sometimes a
 *    trailing period ("920582.").
 */

export interface HnsParseIssue {
  /** 1-based row number in the uploaded file, for pointing the admin at it. */
  readonly line: number;
  readonly message: string;
  /** Party the row belonged to, when known. */
  readonly party?: string;
}

/**
 * A detail row, before it is linked to a Party or given an importDate.
 *
 * `balanceAmount` is non-nullable here even though the stored record allows
 * null: a row without a numeric balance is rejected as an error, so anything
 * that survives parsing definitely has one.
 */
export type HnsParsedRow = Omit<
  HnsOutstandingRecord,
  "importDate" | "extra" | "balanceAmount"
> & { readonly balanceAmount: number };

export interface HnsParseResult {
  readonly rows: readonly HnsParsedRow[];
  readonly errors: readonly HnsParseIssue[];
  readonly warnings: readonly HnsParseIssue[];
  readonly stats: {
    readonly totalLines: number;
    readonly partyCount: number;
    readonly detailRows: number;
    readonly validRows: number;
    readonly invalidRows: number;
    readonly skippedRows: number;
    /** Sum of balanceAmount over valid rows, checked against the report's own total. */
    readonly balanceTotal: number;
    /** Grand total as printed in the file, when found. */
    readonly reportedGrandTotal: number | null;
  };
}

/* -------------------------------------------------------------------------- */
/* CSV tokenising                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Splits one CSV line, honouring double-quoted fields.
 *
 * Quoting matters: CSV subtotals are written as "9,67,300.00", so a naive split
 * on commas would shred them.
 */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ",") {
      fields.push(current);
      current = "";
    } else current += char;
  }

  fields.push(current);
  return fields.map((field) => field.trim());
}

/* -------------------------------------------------------------------------- */
/* Value normalisation                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Parses an H&S amount.
 *
 * Handles Indian digit grouping ("9,67,300.00"), a trailing bare period
 * ("920582."), a leading minus, and parenthesised negatives.
 * Returns `null` when the text is not a number at all.
 */
export function parseAmount(raw: string): number | null {
  let text = raw.trim();
  if (text === "") return null;

  let negative = false;
  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  }

  text = text.replace(/,/g, "").replace(/\.$/, "");
  if (text === "") return null;
  if (!/^\d+(\.\d+)?$/.test(text)) return null;

  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/**
 * Parses an H&S date (`DD-MM-YYYY`) into `YYYY-MM-DD`.
 *
 * `01-01-1900` is the export's "no date" sentinel and becomes `null` rather
 * than a misleading 1900 date. Returns `undefined` for a value that is present
 * but unparseable, so the caller can tell "absent" from "invalid".
 */
export function parseHnsDate(raw: string): string | null | undefined {
  const text = raw.trim();
  if (text === "") return null;
  if (text === HNS_NULL_DATE) return null;

  const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  // Reject impossible days for the month (e.g. 31-02-2026).
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return undefined;
  }
  if (year === 1900) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Collapses runs of whitespace and trims — party names carry trailing spaces. */
export function normalizePartyName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/* -------------------------------------------------------------------------- */
/* Header-driven column mapping                                                */
/* -------------------------------------------------------------------------- */

/** Positions of the fields the importer needs, within a data row. */
export interface HnsColumnMap {
  readonly billNo: number;
  readonly billDate: number;
  readonly billAmount: number;
  readonly receivedAmount: number;
  readonly balanceAmount: number;
  readonly creditDays: number | null;
  readonly dueDate: number | null;
}

/** Header spellings seen across the H&S reports, lower-cased. */
const HEADER_ALIASES = {
  billNo: ["bill", "billno", "bill no", "billnumber", "doc no", "docno"],
  billDate: ["bill_dat", "bill date", "billdate", "bill_date"],
  billAmount: ["billamt", "bill amount", "bill_amt"],
  receivedAmount: ["rec_amt", "received", "received amount", "rec amt"],
  balanceAmount: ["bal_amt", "balance", "balance amount", "bal amt"],
  creditDays: ["crdays", "credit days", "cr days"],
  dueDate: ["duedat", "due date", "due_date", "duedate"],
} as const;

/**
 * Locates each needed column from the report's header row.
 *
 * Two real reports were compared, and their column orders differ entirely — so
 * fixed positions cannot be trusted:
 *
 *   report A: bill | (blank) | crdays  | bill_dat | billamt | ...
 *   report B: Bill Date | (blank) | bill | billamt | CrNoteDocNo | ...
 *
 * Both share one structural quirk: column 1 is reserved for the party group
 * header, and the generator writes the *first* header one column to the left of
 * the data it labels. So a header found at index 0 addresses data at index 1;
 * every other header aligns with its own index.
 */
export function resolveColumns(headerRow: readonly string[]): HnsColumnMap | null {
  const normalized = headerRow.map((cell) => cell.trim().toLowerCase());

  const find = (aliases: readonly string[]): number | null => {
    for (const alias of aliases) {
      const index = normalized.indexOf(alias);
      // A header sitting at index 0 labels the data in column 1.
      if (index === 0) return 1;
      if (index > 0) return index;
    }
    return null;
  };

  const billNo = find(HEADER_ALIASES.billNo);
  const billDate = find(HEADER_ALIASES.billDate);
  const billAmount = find(HEADER_ALIASES.billAmount);
  const receivedAmount = find(HEADER_ALIASES.receivedAmount);
  const balanceAmount = find(HEADER_ALIASES.balanceAmount);

  // Without these five there is nothing meaningful to import.
  if (
    billNo === null ||
    billDate === null ||
    billAmount === null ||
    receivedAmount === null ||
    balanceAmount === null
  ) {
    return null;
  }

  return {
    billNo,
    billDate,
    billAmount,
    receivedAmount,
    balanceAmount,
    creditDays: find(HEADER_ALIASES.creditDays),
    dueDate: find(HEADER_ALIASES.dueDate),
  };
}

/** True when the row looks like the report's header row. */
function isHeaderRow(fields: readonly string[]): boolean {
  return resolveColumns(fields) !== null;
}

/* -------------------------------------------------------------------------- */
/* Parser                                                                      */
/* -------------------------------------------------------------------------- */

const cellAt = (fields: readonly string[], index: number | null): string =>
  index === null ? "" : (fields[index] ?? "").trim();

/**
 * Parses a grid of already-tokenised cells.
 *
 * This is the shared core: the CSV path splits lines into it, and the Excel
 * path flattens worksheet cells into it. Neither knows about the other.
 */
export function parseHnsRows(grid: readonly (readonly string[])[]): HnsParseResult {
  const rows: HnsParsedRow[] = [];
  const errors: HnsParseIssue[] = [];
  const warnings: HnsParseIssue[] = [];

  let columns: HnsColumnMap | null = null;
  let currentParty: string | null = null;
  let partyCount = 0;
  let detailRows = 0;
  let skippedRows = 0;
  let balanceTotal = 0;
  let reportedGrandTotal: number | null = null;

  for (let index = 0; index < grid.length; index++) {
    const fields = grid[index] ?? [];
    const lineNumber = index + 1;
    const nonEmpty = fields.filter((field) => field.trim() !== "");

    if (nonEmpty.length === 0) {
      skippedRows++;
      continue;
    }

    // Header row: locks in the column layout for everything below it.
    if (columns === null) {
      const resolved = resolveColumns(fields);
      if (resolved) {
        columns = resolved;
        continue;
      }
      // Title row, or anything before the header — nothing can be read yet.
      skippedRows++;
      continue;
    }

    // A second header row (some exports repeat it per page) is skipped.
    if (isHeaderRow(fields) && cellAt(fields, columns.billNo) === "") {
      skippedRows++;
      continue;
    }

    const first = (fields[0] ?? "").trim();

    // Party header: a name in column 1 and nothing else on the row.
    if (first !== "" && nonEmpty.length === 1) {
      currentParty = normalizePartyName(first) || null;
      if (currentParty) partyCount++;
      continue;
    }

    const billNo = cellAt(fields, columns.billNo);
    const billDateRaw = cellAt(fields, columns.billDate);

    // Subtotal / grand total: no bill number and no bill date, but amounts
    // present. This signature holds across both report layouts, whereas a
    // fixed column position does not.
    //
    // Column 1 is deliberately not required to be empty: one report writes the
    // row count there on its grand-total line ("422 | | | 32722692 | ...").
    // Party headers are already handled above, so nothing else reaches here.
    if (billNo === "" && billDateRaw === "") {
      if (currentParty === null) {
        reportedGrandTotal = parseAmount(cellAt(fields, columns.balanceAmount));
      }
      currentParty = null;
      skippedRows++;
      continue;
    }

    // ---- detail row ----
    detailRows++;

    if (currentParty === null) {
      errors.push({
        line: lineNumber,
        message:
          "Bill row appears before any party name; the file may be truncated or reordered.",
      });
      continue;
    }

    const billAmountRaw = cellAt(fields, columns.billAmount);
    const receivedRaw = cellAt(fields, columns.receivedAmount);
    const balanceRaw = cellAt(fields, columns.balanceAmount);
    const dueDateRaw = cellAt(fields, columns.dueDate);
    const creditDaysRaw = cellAt(fields, columns.creditDays);

    const billDate = parseHnsDate(billDateRaw);
    const dueDate = parseHnsDate(dueDateRaw);
    const billAmount = parseAmount(billAmountRaw);
    const receivedAmount = parseAmount(receivedRaw);
    const balanceAmount = parseAmount(balanceRaw);

    const rowErrors: string[] = [];

    if (billDate === undefined) {
      rowErrors.push(`Bill date "${billDateRaw}" is not a valid DD-MM-YYYY date.`);
    }
    if (dueDate === undefined) {
      rowErrors.push(`Due date "${dueDateRaw}" is not a valid DD-MM-YYYY date.`);
    }
    if (billAmount === null && billAmountRaw !== "") {
      rowErrors.push(`Bill amount "${billAmountRaw}" is not a number.`);
    }
    if (receivedAmount === null && receivedRaw !== "") {
      rowErrors.push(`Received amount "${receivedRaw}" is not a number.`);
    }
    // The balance is the one figure the whole report exists to convey.
    if (balanceAmount === null) {
      rowErrors.push(
        balanceRaw === ""
          ? "Balance amount is missing."
          : `Balance amount "${balanceRaw}" is not a number.`,
      );
    }

    if (rowErrors.length > 0) {
      for (const message of rowErrors) {
        errors.push({ line: lineNumber, message, party: currentParty });
      }
      continue;
    }

    if (billNo === "") {
      warnings.push({
        line: lineNumber,
        party: currentParty,
        message:
          "Bill row has no bill number (usually an opening balance). Imported as-is.",
      });
    }

    // Already reported above; this narrows the type and keeps the guarantee
    // that every emitted row has a numeric balance.
    if (balanceAmount === null) continue;

    rows.push({
      // No party code exists in this export; it is filled in server-side by
      // matching the party name against the Parties sheet.
      hnsPartyCode: "",
      partyName: currentParty,
      billNo: billNo === "" ? null : billNo,
      billDate: billDate ?? null,
      creditDays: creditDaysRaw === "" ? null : parseAmount(creditDaysRaw),
      billAmount,
      receivedAmount,
      balanceAmount,
      dueDate: dueDate ?? null,
    });

    balanceTotal += balanceAmount;

    if (rows.length > HNS_MAX_ROWS) {
      errors.push({
        line: lineNumber,
        message: `File exceeds the ${HNS_MAX_ROWS}-row import limit.`,
      });
      break;
    }
  }

  if (columns === null) {
    errors.unshift({
      line: 1,
      message:
        "This does not look like an H&S outstanding export: no header row " +
        "naming the bill, amount and balance columns was found.",
    });
  }

  return {
    rows,
    errors,
    warnings,
    stats: {
      totalLines: grid.length,
      partyCount,
      detailRows,
      validRows: rows.length,
      invalidRows: detailRows - rows.length,
      skippedRows,
      balanceTotal: Math.round(balanceTotal * 100) / 100,
      reportedGrandTotal,
    },
  };
}

/** Parses the CSV form of the export. Kept for files already saved as CSV. */
export function parseHnsOutstanding(text: string): HnsParseResult {
  // Strip a UTF-8 BOM; Excel writes one.
  const clean = text.replace(/^﻿/, "");
  const grid = clean.split(/\r\n|\n|\r/).map(splitCsvLine);
  return parseHnsRows(grid);
}
