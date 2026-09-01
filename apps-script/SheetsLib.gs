/**
 * Sheet access helpers. Read-only in this step — nothing here writes.
 */

/**
 * Opens the master spreadsheet recorded by `setupSpreadsheet()`.
 * @return {Spreadsheet}
 */
/**
 * Cached for the lifetime of one execution.
 *
 * Apps Script resets globals between invocations, so this is per-request state,
 * not shared mutable data. Caching matters a lot: `SpreadsheetApp.openById` is
 * a service round trip, and without this it was being called once per date cell
 * — roughly 1,300 times for a 422-row snapshot, which took over a minute.
 */
var CACHED_SPREADSHEET_ = null;
var CACHED_TIMEZONE_ = null;

function getSpreadsheet_() {
  if (CACHED_SPREADSHEET_) return CACHED_SPREADSHEET_;

  var id = PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
  if (!id) {
    throw new ApiException(
      'NOT_CONFIGURED',
      'SPREADSHEET_ID is not set. Run setupSpreadsheet() once from the Apps Script editor.'
    );
  }
  CACHED_SPREADSHEET_ = SpreadsheetApp.openById(id);
  return CACHED_SPREADSHEET_;
}

/**
 * Returns a tab by name.
 * @param {string} name
 * @return {Sheet}
 */
function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    throw new ApiException(
      'NOT_FOUND',
      'Sheet "' + name + '" does not exist. Run setupSpreadsheet() to create it.'
    );
  }
  return sheet;
}

/**
 * Reads a whole tab into plain objects keyed by its header row.
 *
 * Blank rows are skipped. Columns beyond the known schema are collected into
 * `extra`, so a wider H&S export widens the payload instead of breaking.
 *
 * @param {string} sheetName
 * @param {Array.<string>=} knownHeaders headers considered part of the schema
 * @return {Array.<Object>}
 */
function readRows_(sheetName, knownHeaders) {
  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();

  // Row 1 is headers; nothing below it means no data.
  if (lastRow < 2 || lastColumn < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  var headers = values[0].map(function (h) { return String(h || '').trim(); });

  var known = {};
  if (knownHeaders) {
    for (var k = 0; k < knownHeaders.length; k++) known[knownHeaders[k]] = true;
  }

  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var raw = values[r];
    if (isBlankRow_(raw)) continue;

    var row = {};
    var extra = {};
    var hasExtra = false;

    for (var c = 0; c < headers.length; c++) {
      var header = headers[c];
      if (!header) continue;

      var value = coerceValue_(header, raw[c]);

      if (knownHeaders && !known[header]) {
        extra[header] = value === null ? '' : String(value);
        hasExtra = true;
      } else {
        row[header] = value;
      }
    }

    if (hasExtra) row.extra = extra;
    rows.push(row);
  }

  return rows;
}

/**
 * True when every cell in the row is empty.
 * @param {Array} raw
 * @return {boolean}
 */
function isBlankRow_(raw) {
  for (var i = 0; i < raw.length; i++) {
    var v = raw[i];
    if (v !== '' && v !== null && v !== undefined) return false;
  }
  return true;
}

/**
 * Converts one cell to the JSON shape the frontend types expect.
 * @param {string} header
 * @param {*} value
 * @return {*}
 */
function coerceValue_(header, value) {
  if (value === '' || value === null || value === undefined) {
    return BOOLEAN_COLUMNS[header] ? false : null;
  }

  if (BOOLEAN_COLUMNS[header]) return toBoolean_(value);
  if (NUMERIC_COLUMNS[header]) return toNumber_(value);
  if (MONTH_KEY_COLUMNS[header]) return toMonthKeyString_(value);
  if (DATE_COLUMNS[header]) return toDateString_(value);
  if (TIMESTAMP_COLUMNS[header]) return toTimestamp_(value);

  return String(value);
}

/**
 * Accepts TRUE/FALSE, yes/no, 1/0 and real booleans.
 * @param {*} value
 * @return {boolean}
 */
function toBoolean_(value) {
  if (typeof value === 'boolean') return value;
  var text = String(value).trim().toLowerCase();
  return text === 'true' || text === 'yes' || text === 'y' || text === '1';
}

/**
 * @param {*} value
 * @return {number|null}
 */
function toNumber_(value) {
  if (typeof value === 'number') return isNaN(value) ? null : value;
  // Tolerate values typed with separators, e.g. "1,25,000.50".
  var text = String(value).replace(/[,\s]/g, '');
  if (text === '') return null;
  var num = Number(text);
  return isNaN(num) ? null : num;
}

/**
 * Normalises a cell to `YYYY-MM-DD` in the spreadsheet's own timezone.
 * @param {*} value
 * @return {string|null}
 */
function toDateString_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, getTimeZone_(), 'yyyy-MM-dd');
  }
  var text = String(value).trim();
  if (text === '') return null;

  // Already ISO-ish: keep the date part verbatim.
  var iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, getTimeZone_(), 'yyyy-MM-dd');
  }
  return text;
}

/**
 * Normalises a month key to `YYYY-MM`.
 *
 * Accepts a real Date — which is what Sheets stores when someone types
 * `2026-08` into a cell — an already-correct string, or anything else
 * date-like.
 *
 * @param {*} value
 * @return {string|null}
 */
function toMonthKeyString_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, getTimeZone_(), 'yyyy-MM');
  }
  var text = String(value).trim();
  if (text === '') return null;

  var iso = text.match(/^(\d{4})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2];

  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, getTimeZone_(), 'yyyy-MM');
  }
  return text;
}

/**
 * Normalises a cell to an ISO 8601 timestamp.
 * @param {*} value
 * @return {string|null}
 */
function toTimestamp_(value) {
  if (value instanceof Date) return value.toISOString();
  var text = String(value).trim();
  if (text === '') return null;
  var parsed = new Date(text);
  return isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

/**
 * @return {string} spreadsheet timezone, falling back to the script's.
 */
function getTimeZone_() {
  if (CACHED_TIMEZONE_) return CACHED_TIMEZONE_;
  try {
    CACHED_TIMEZONE_ = getSpreadsheet_().getSpreadsheetTimeZone();
  } catch (err) {
    CACHED_TIMEZONE_ = Session.getScriptTimeZone();
  }
  return CACHED_TIMEZONE_;
}

/**
 * Derives `YYYY-MM` from a date-like value. Returns null when unparseable.
 * Used for FollowUps, which has no month column of its own.
 *
 * @param {*} value
 * @return {string|null}
 */
function monthKeyOf_(value) {
  var date = toDateString_(value);
  if (!date) return null;
  var match = String(date).match(/^(\d{4}-\d{2})/);
  return match ? match[1] : null;
}
