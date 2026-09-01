/**
 * Application-wide constants.
 *
 * The sheet names and header rows below are the single source of truth for the
 * database schema. `apps-script/Config.gs` mirrors this exact structure — the
 * two must be changed together, since Apps Script cannot import TypeScript.
 */

/* -------------------------------------------------------------------------- */
/* Storage contract (Google Sheets)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Tab names inside "Bright Paper Collection System".
 *
 * Each concept gets its own tab — H&S outstanding data is never written into
 * the same tab as collection transactions.
 */
export const SHEET_NAMES = {
  /** Login accounts and roles. */
  users: "Users",
  /** Master list of parties (customers). */
  parties: "Parties",
  /** Which salesman owns which party. */
  partyAssignments: "PartyAssignments",
  /** Rows imported from the H&S ERP export. Read-only inside this app. */
  hnsOutstanding: "HNS_Outstanding",
  /** Collection transactions recorded by the application. Append-only. */
  collections: "Collections",
  /** Follow-up notes, remarks and next-follow-up dates. Append-only. */
  followUps: "FollowUps",
  /** Cached month-wise rollups. Structure only — no calculations yet. */
  monthlySummary: "MonthlySummary",
  /** Per-user permission flags. */
  permissions: "Permissions",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

/**
 * Exact header row for every tab, in column order.
 *
 * `HNS_Outstanding` is deliberately the widest schema: the real H&S export may
 * carry extra columns, and the reader tolerates any additional trailing headers
 * rather than failing.
 */
export const SHEET_HEADERS = {
  [SHEET_NAMES.users]: [
    "userId",
    "username",
    "password",
    "name",
    "role",
    "active",
    "createdAt",
    "updatedAt",
  ],
  [SHEET_NAMES.parties]: [
    "partyId",
    "hnsPartyCode",
    "partyName",
    "phone",
    "address",
    "city",
    "active",
    "createdAt",
    "updatedAt",
  ],
  [SHEET_NAMES.partyAssignments]: [
    "assignmentId",
    "partyId",
    "salesmanId",
    "assignedAt",
    "assignedBy",
    "active",
  ],
  [SHEET_NAMES.hnsOutstanding]: [
    "hnsPartyCode",
    "partyName",
    "billNo",
    "billDate",
    "creditDays",
    "billAmount",
    "receivedAmount",
    "balanceAmount",
    "dueDate",
    "importDate",
  ],
  [SHEET_NAMES.collections]: [
    "collectionId",
    "partyId",
    "salesmanId",
    "amount",
    "paymentDate",
    "monthKey",
    "paymentMode",
    "referenceNo",
    "remark",
    "createdAt",
    "updatedAt",
  ],
  [SHEET_NAMES.followUps]: [
    "followUpId",
    "partyId",
    "salesmanId",
    "followUpDate",
    "nextFollowUpDate",
    "remark",
    "status",
    "createdAt",
    "updatedAt",
  ],
  [SHEET_NAMES.monthlySummary]: [
    "monthKey",
    "salesmanId",
    "totalDue",
    "totalCollected",
    "totalBalance",
    "collectionPercentage",
    "updatedAt",
  ],
  [SHEET_NAMES.permissions]: [
    "permissionId",
    "userId",
    "canViewAssignedParties",
    "canAddCollection",
    "canEditCollection",
    "canDeleteCollection",
    "canAddFollowUp",
    "canEditFollowUp",
    "canDeleteFollowUp",
    "canViewReports",
    "canExport",
    "updatedAt",
  ],
} as const satisfies Record<SheetName, readonly string[]>;

/** The spreadsheet `setupSpreadsheet()` creates in Drive. */
export const SPREADSHEET_NAME = "Bright Paper Collection System";

/* -------------------------------------------------------------------------- */
/* Domain vocabularies                                                        */
/* -------------------------------------------------------------------------- */

/** Role values as used inside the app (routes, navigation, permissions). */
export const USER_ROLES = ["admin", "salesman"] as const;

/**
 * Role values as stored in the `Users` sheet. Apps Script emits these; the
 * transport layer lower-cases them into `USER_ROLES` on the way in.
 */
export const SHEET_USER_ROLES = {
  admin: "ADMIN",
  salesman: "SALESMAN",
} as const;

/** Follow-up status values used by the `followUps.list` filter. */
export const FOLLOW_UP_STATUSES = ["open", "closed"] as const;

/** Boolean capability columns on the `Permissions` sheet. */
export const PERMISSION_FLAGS = [
  "canViewAssignedParties",
  "canAddCollection",
  "canEditCollection",
  "canDeleteCollection",
  "canAddFollowUp",
  "canEditFollowUp",
  "canDeleteFollowUp",
  "canViewReports",
  "canExport",
] as const;

/* -------------------------------------------------------------------------- */
/* Formatting & locale                                                        */
/* -------------------------------------------------------------------------- */

export const LOCALE = "en-IN";
export const CURRENCY = "INR";

/** Canonical month key format used for every month-wise partition: `YYYY-MM`. */
export const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Canonical date format stored in Sheets: `YYYY-MM-DD`. */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
