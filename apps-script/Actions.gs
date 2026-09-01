/**
 * Read actions for Step 2.
 *
 * Every handler returns real sheet rows or an empty array. Nothing here
 * fabricates records, invents months, or computes collection totals.
 */

/** Header lists reused for schema-aware reads. */
function headersFor_(sheetName) {
  for (var i = 0; i < SHEET_SCHEMA.length; i++) {
    if (SHEET_SCHEMA[i].name === sheetName) return SHEET_SCHEMA[i].headers;
  }
  return null;
}

/**
 * `parties.list` — rows from the Parties sheet.
 *
 * Optional filters: salesmanId, active, search.
 * `salesmanId` is resolved through PartyAssignments; authorisation is NOT
 * applied here yet — this is only a filter.
 *
 * @param {{salesmanId: string=, active: boolean=, search: string=}} payload
 * @return {Array.<Object>}
 */
function getParties(payload) {
  var rows = readRows_(SHEET_NAMES.PARTIES, headersFor_(SHEET_NAMES.PARTIES));

  if (payload.salesmanId) {
    var allowed = partyIdsForSalesman_(String(payload.salesmanId));
    rows = rows.filter(function (row) { return allowed[row.partyId] === true; });
  }

  if (payload.active !== undefined && payload.active !== null) {
    var wantActive = toBoolean_(payload.active);
    rows = rows.filter(function (row) { return row.active === wantActive; });
  }

  if (payload.search) {
    var needle = String(payload.search).trim().toLowerCase();
    if (needle !== '') {
      rows = rows.filter(function (row) {
        return containsText_(row.partyName, needle) ||
               containsText_(row.hnsPartyCode, needle) ||
               containsText_(row.city, needle) ||
               containsText_(row.phone, needle);
      });
    }
  }

  return rows;
}

/**
 * `collections.list` — rows from the Collections sheet.
 *
 * Optional filters: monthKey, partyId, salesmanId.
 * Rows keep the monthKey they were written with; nothing is recomputed.
 *
 * @param {{monthKey: string=, partyId: string=, salesmanId: string=}} payload
 * @return {Array.<Object>}
 */
function getCollections(payload) {
  var rows = readRows_(SHEET_NAMES.COLLECTIONS, headersFor_(SHEET_NAMES.COLLECTIONS));

  if (payload.monthKey) {
    var monthKey = String(payload.monthKey);
    rows = rows.filter(function (row) { return row.monthKey === monthKey; });
  }
  if (payload.partyId) {
    var partyId = String(payload.partyId);
    rows = rows.filter(function (row) { return row.partyId === partyId; });
  }
  if (payload.salesmanId) {
    var salesmanId = String(payload.salesmanId);
    rows = rows.filter(function (row) { return row.salesmanId === salesmanId; });
  }

  // Newest payment first; undated rows sink to the bottom.
  rows.sort(function (a, b) {
    return String(b.paymentDate || '').localeCompare(String(a.paymentDate || ''));
  });

  return rows;
}

/**
 * `followUps.list` — rows from the FollowUps sheet.
 *
 * Optional filters: monthKey, partyId, salesmanId, status.
 * The sheet has no month column, so monthKey is derived from followUpDate.
 *
 * @param {{monthKey: string=, partyId: string=, salesmanId: string=, status: string=}} payload
 * @return {Array.<Object>}
 */
function getFollowUps(payload) {
  var rows = readRows_(SHEET_NAMES.FOLLOW_UPS, headersFor_(SHEET_NAMES.FOLLOW_UPS));

  if (payload.monthKey) {
    var monthKey = String(payload.monthKey);
    rows = rows.filter(function (row) {
      return monthKeyOf_(row.followUpDate) === monthKey;
    });
  }
  if (payload.partyId) {
    var partyId = String(payload.partyId);
    rows = rows.filter(function (row) { return row.partyId === partyId; });
  }
  if (payload.salesmanId) {
    var salesmanId = String(payload.salesmanId);
    rows = rows.filter(function (row) { return row.salesmanId === salesmanId; });
  }
  if (payload.status) {
    var status = String(payload.status).toLowerCase();
    rows = rows.filter(function (row) {
      return String(row.status || '').toLowerCase() === status;
    });
  }

  rows.sort(function (a, b) {
    return String(b.followUpDate || '').localeCompare(String(a.followUpDate || ''));
  });

  return rows;
}

/**
 * `reports.availablePeriods` — the months that actually contain data.
 *
 * Collected from Collections.monthKey and from FollowUps.followUpDate, so a
 * month with follow-ups but no payments is still selectable. Nothing is
 * generated from the calendar: an empty database returns [].
 *
 * @param {{salesmanId: string=}} payload
 * @return {Array.<string>} `YYYY-MM`, newest first
 */
function getAvailablePeriods(payload) {
  var salesmanId = payload && payload.salesmanId ? String(payload.salesmanId) : null;
  var seen = {};

  var collections = readRows_(SHEET_NAMES.COLLECTIONS, headersFor_(SHEET_NAMES.COLLECTIONS));
  for (var i = 0; i < collections.length; i++) {
    var row = collections[i];
    if (salesmanId && row.salesmanId !== salesmanId) continue;
    if (isMonthKey_(row.monthKey)) seen[row.monthKey] = true;
  }

  var followUps = readRows_(SHEET_NAMES.FOLLOW_UPS, headersFor_(SHEET_NAMES.FOLLOW_UPS));
  for (var j = 0; j < followUps.length; j++) {
    var followUp = followUps[j];
    if (salesmanId && followUp.salesmanId !== salesmanId) continue;
    var key = monthKeyOf_(followUp.followUpDate);
    if (isMonthKey_(key)) seen[key] = true;
  }

  return Object.keys(seen).sort().reverse();
}

/**
 * Party ids currently assigned to a salesman, as a lookup map.
 * @param {string} salesmanId
 * @return {Object.<string, boolean>}
 */
function partyIdsForSalesman_(salesmanId) {
  var assignments = readRows_(
    SHEET_NAMES.PARTY_ASSIGNMENTS,
    headersFor_(SHEET_NAMES.PARTY_ASSIGNMENTS)
  );
  var map = {};
  for (var i = 0; i < assignments.length; i++) {
    var row = assignments[i];
    if (row.salesmanId === salesmanId && row.active === true) {
      map[row.partyId] = true;
    }
  }
  return map;
}

/**
 * @param {*} value
 * @return {boolean} true when value looks like `YYYY-MM`
 */
function isMonthKey_(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/**
 * @param {*} haystack
 * @param {string} needleLower
 * @return {boolean}
 */
function containsText_(haystack, needleLower) {
  if (haystack === null || haystack === undefined) return false;
  return String(haystack).toLowerCase().indexOf(needleLower) !== -1;
}
