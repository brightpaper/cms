/**
 * Bright Paper Collection System — configuration and schema.
 *
 * This file mirrors `src/config/constants.ts` in the Next.js project. Apps
 * Script cannot import TypeScript, so the two are kept in sync by hand: if you
 * change a tab name or a header here, change it there too.
 */

/** Name of the master spreadsheet created in Drive. */
var SPREADSHEET_NAME = 'Bright Paper Collection System';

/** Script Property keys. Set via File > Project properties, or by setup. */
var PROP_SPREADSHEET_ID = 'SPREADSHEET_ID';
var PROP_API_KEY = 'API_KEY';

var SHEET_NAMES = {
  USERS: 'Users',
  PARTIES: 'Parties',
  PARTY_ASSIGNMENTS: 'PartyAssignments',
  HNS_OUTSTANDING: 'HNS_Outstanding',
  COLLECTIONS: 'Collections',
  FOLLOW_UPS: 'FollowUps',
  MONTHLY_SUMMARY: 'MonthlySummary',
  PERMISSIONS: 'Permissions'
};

/**
 * Exact header row for every tab, in column order.
 *
 * HNS_Outstanding is intentionally extensible: the reader returns any extra
 * trailing columns under `extra`, so a wider H&S export does not break reads.
 */
var SHEET_SCHEMA = [
  {
    name: SHEET_NAMES.USERS,
    headers: [
      'userId', 'username', 'password', 'name',
      'role', 'active', 'createdAt', 'updatedAt'
    ]
  },
  {
    name: SHEET_NAMES.PARTIES,
    headers: [
      'partyId', 'hnsPartyCode', 'partyName', 'phone',
      'address', 'city', 'active', 'createdAt', 'updatedAt'
    ]
  },
  {
    name: SHEET_NAMES.PARTY_ASSIGNMENTS,
    headers: [
      'assignmentId', 'partyId', 'salesmanId',
      'assignedAt', 'assignedBy', 'active'
    ]
  },
  {
    name: SHEET_NAMES.HNS_OUTSTANDING,
    headers: [
      'hnsPartyCode', 'partyName', 'billNo', 'billDate', 'creditDays',
      'billAmount', 'receivedAmount', 'balanceAmount', 'dueDate', 'importDate'
    ]
  },
  {
    name: SHEET_NAMES.COLLECTIONS,
    headers: [
      'collectionId', 'partyId', 'salesmanId', 'amount', 'paymentDate',
      'monthKey', 'paymentMode', 'referenceNo', 'remark',
      'createdAt', 'updatedAt'
    ]
  },
  {
    name: SHEET_NAMES.FOLLOW_UPS,
    headers: [
      'followUpId', 'partyId', 'salesmanId', 'followUpDate',
      'nextFollowUpDate', 'remark', 'status', 'createdAt', 'updatedAt'
    ]
  },
  {
    name: SHEET_NAMES.MONTHLY_SUMMARY,
    headers: [
      'monthKey', 'salesmanId', 'totalDue', 'totalCollected',
      'totalBalance', 'collectionPercentage', 'updatedAt'
    ]
  },
  {
    name: SHEET_NAMES.PERMISSIONS,
    headers: [
      'permissionId', 'userId',
      'canViewAssignedParties', 'canAddCollection', 'canEditCollection',
      'canDeleteCollection', 'canAddFollowUp', 'canEditFollowUp',
      'canDeleteFollowUp', 'canViewReports', 'canExport', 'updatedAt'
    ]
  }
];

/**
 * Columns that must never be auto-converted by Sheets.
 *
 * Applied as a plain-text number format when a tab is first created, so an
 * all-digit password keeps its leading zeros and a month key stays a string.
 * Only ever applied to a sheet with no data rows, so existing values are safe.
 */
var PLAIN_TEXT_COLUMNS = {
  Users: ['password'],
  Collections: ['monthKey']
};

/** Columns that should be read as numbers rather than strings. */
var NUMERIC_COLUMNS = {
  amount: true,
  creditDays: true,
  billAmount: true,
  receivedAmount: true,
  balanceAmount: true,
  totalDue: true,
  totalCollected: true,
  totalBalance: true,
  collectionPercentage: true
};

/** Columns that should be read as booleans. */
var BOOLEAN_COLUMNS = {
  active: true,
  canViewAssignedParties: true,
  canAddCollection: true,
  canEditCollection: true,
  canDeleteCollection: true,
  canAddFollowUp: true,
  canEditFollowUp: true,
  canDeleteFollowUp: true,
  canViewReports: true,
  canExport: true
};

/**
 * Columns holding a `YYYY-MM` month key.
 *
 * Sheets silently converts a typed `2026-08` into a Date, so these are
 * normalised back to `YYYY-MM` on read. Without this the value round-trips as
 * a JS Date string and every month filter misses.
 */
var MONTH_KEY_COLUMNS = {
  monthKey: true
};

/** Columns holding a date-only value, normalised to `YYYY-MM-DD`. */
var DATE_COLUMNS = {
  paymentDate: true,
  followUpDate: true,
  nextFollowUpDate: true,
  billDate: true,
  dueDate: true,
  importDate: true,
  assignedAt: true
};

/** Columns holding a full timestamp, normalised to ISO 8601. */
var TIMESTAMP_COLUMNS = {
  createdAt: true,
  updatedAt: true
};
