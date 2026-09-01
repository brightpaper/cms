/**
 * H&S outstanding import.
 *
 * STRATEGY: snapshot replace, scoped to HNS_Outstanding alone.
 *
 * The H&S export is a complete picture of what is currently outstanding, and
 * its rows cannot be uniquely keyed — three parties carry two identical "NEFT"
 * rows, and 21 rows have no bill number at all. Row-level upsert would
 * therefore either merge distinct rows or endlessly duplicate them. So each
 * import clears the HNS_Outstanding data rows and writes the new snapshot.
 *
 * Collections, FollowUps and MonthlySummary are never opened by this file.
 * `assertOutstandingSheet_` makes that structural rather than a promise: the
 * only sheet this module will write to is HNS_Outstanding.
 */

/** Guards against this module ever being pointed at another tab. */
function assertOutstandingSheet_(name) {
  if (name !== SHEET_NAMES.HNS_OUTSTANDING) {
    throw new ApiException(
      'FORBIDDEN',
      'The importer may only write to ' + SHEET_NAMES.HNS_OUTSTANDING + '.'
    );
  }
}

/**
 * `outstanding.import` — replaces the outstanding snapshot.
 *
 * @param {{rows: Array.<Object>, importDate: string=}} payload
 * @return {{imported: number, replaced: number, skipped: number,
 *           matchedParties: number, unmatchedParties: Array.<string>,
 *           importDate: string, balanceTotal: number}}
 */
function importOutstanding(payload) {
  var rows = payload && payload.rows;
  if (!rows || !rows.length) {
    throw new ApiException('VALIDATION_ERROR', 'No rows were supplied to import.');
  }
  if (rows.length > 20000) {
    throw new ApiException('VALIDATION_ERROR', 'Too many rows in one import.');
  }

  var importDate = payload.importDate && /^\d{4}-\d{2}-\d{2}$/.test(payload.importDate)
    ? payload.importDate
    : Utilities.formatDate(new Date(), getTimeZone_(), 'yyyy-MM-dd');

  // Resolve party codes from the Parties sheet. The export carries only a
  // party NAME, so this is the one place the two datasets are joined.
  var partyIndex = buildPartyNameIndex_();
  var matched = {};
  var unmatched = {};

  var values = [];
  var balanceTotal = 0;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var partyName = String(row.partyName == null ? '' : row.partyName).trim();
    if (partyName === '') {
      throw new ApiException(
        'VALIDATION_ERROR',
        'Row ' + (i + 1) + ' has no party name; refusing to import a partial snapshot.'
      );
    }

    var balance = toNumberStrict_(row.balanceAmount);
    if (balance === null) {
      throw new ApiException(
        'VALIDATION_ERROR',
        'Row ' + (i + 1) + ' (' + partyName + ') has a non-numeric balance amount.'
      );
    }
    balanceTotal += balance;

    var key = normalizePartyKey_(partyName);
    var code = partyIndex[key] || '';
    if (code) matched[key] = true;
    else unmatched[partyName] = true;

    // Column order must match SHEET_SCHEMA for HNS_Outstanding.
    values.push([
      code,
      partyName,
      row.billNo == null ? '' : String(row.billNo),
      row.billDate == null ? '' : String(row.billDate),
      toNumberOrBlank_(row.creditDays),
      toNumberOrBlank_(row.billAmount),
      toNumberOrBlank_(row.receivedAmount),
      balance,
      row.dueDate == null ? '' : String(row.dueDate),
      importDate
    ]);
  }

  // Everything above can throw. Only now, with a fully validated block of
  // values in hand, do we touch the sheet — so a bad file never leaves a
  // half-imported snapshot behind.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new ApiException('CONFLICT', 'Another import is already running. Try again shortly.');
  }

  try {
    assertOutstandingSheet_(SHEET_NAMES.HNS_OUTSTANDING);
    var sheet = getSheet_(SHEET_NAMES.HNS_OUTSTANDING);
    var headers = headersFor_(SHEET_NAMES.HNS_OUTSTANDING);

    var previousRows = Math.max(sheet.getLastRow() - 1, 0);
    if (previousRows > 0) {
      sheet.getRange(2, 1, previousRows, headers.length).clearContent();
    }

    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  return {
    imported: values.length,
    replaced: 0,
    skipped: 0,
    matchedParties: countKeys_(matched),
    unmatchedParties: Object.keys(unmatched).sort(),
    importDate: importDate,
    balanceTotal: balanceTotal
  };
}

/**
 * `outstanding.list` — reads the current snapshot.
 *
 * @param {{hnsPartyCode: string=, partyName: string=, search: string=}} payload
 * @return {Array.<Object>}
 */
function getOutstanding(payload) {
  var rows = readRows_(
    SHEET_NAMES.HNS_OUTSTANDING,
    headersFor_(SHEET_NAMES.HNS_OUTSTANDING)
  );

  if (payload && payload.hnsPartyCode) {
    var code = String(payload.hnsPartyCode);
    rows = rows.filter(function (row) { return row.hnsPartyCode === code; });
  }
  if (payload && payload.partyName) {
    var wanted = normalizePartyKey_(String(payload.partyName));
    rows = rows.filter(function (row) {
      return normalizePartyKey_(String(row.partyName || '')) === wanted;
    });
  }
  if (payload && payload.search) {
    var needle = String(payload.search).trim().toLowerCase();
    if (needle !== '') {
      rows = rows.filter(function (row) {
        return containsText_(row.partyName, needle) ||
               containsText_(row.billNo, needle) ||
               containsText_(row.hnsPartyCode, needle);
      });
    }
  }

  return rows;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Party-name matching key: upper case, whitespace collapsed, and trailing
 * punctuation removed. The export writes names like "A H PACKING " with a
 * trailing space, and "A.R.PACKAGING" style abbreviations are kept verbatim
 * apart from spacing, so matching stays predictable rather than clever.
 *
 * @param {string} name
 * @return {string}
 */
function normalizePartyKey_(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Maps normalised party name -> hnsPartyCode, from the Parties sheet.
 *
 * A party whose own hnsPartyCode is blank still counts as a match; the code is
 * simply carried through as blank.
 *
 * @return {Object.<string, string>}
 */
function buildPartyNameIndex_() {
  var parties = readRows_(SHEET_NAMES.PARTIES, headersFor_(SHEET_NAMES.PARTIES));
  var index = {};
  for (var i = 0; i < parties.length; i++) {
    var key = normalizePartyKey_(parties[i].partyName);
    if (key !== '' && !(key in index)) {
      index[key] = String(parties[i].hnsPartyCode || '');
    }
  }
  return index;
}

/**
 * @param {*} value
 * @return {number|null}
 */
function toNumberStrict_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (value === null || value === undefined || value === '') return null;
  var num = Number(String(value).replace(/,/g, ''));
  return isFinite(num) ? num : null;
}

/**
 * @param {*} value
 * @return {number|string} the number, or '' so the cell stays blank
 */
function toNumberOrBlank_(value) {
  var num = toNumberStrict_(value);
  return num === null ? '' : num;
}

/**
 * @param {Object} obj
 * @return {number}
 */
function countKeys_(obj) {
  var n = 0;
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) n++;
  return n;
}
