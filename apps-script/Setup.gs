/**
 * One-time (and safely repeatable) spreadsheet provisioning.
 *
 * Run `setupSpreadsheet()` from the Apps Script editor. It is idempotent:
 *  - reuses the spreadsheet recorded in Script Properties, if present;
 *  - reuses any tab that already exists;
 *  - only appends missing header columns;
 *  - never clears a cell, deletes a row, or removes a tab.
 */

/**
 * Creates or reuses the master spreadsheet and ensures every tab and header
 * exists. Safe to run any number of times.
 *
 * @return {{spreadsheetId: string, spreadsheetUrl: string, created: boolean, sheets: Array}}
 */
function setupSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty(PROP_SPREADSHEET_ID);

  var spreadsheet = null;
  var created = false;

  if (existingId) {
    try {
      spreadsheet = SpreadsheetApp.openById(existingId);
    } catch (err) {
      // The stored id points at something we can no longer open (deleted or
      // permissions changed). Fall through and create a fresh spreadsheet
      // rather than failing — the old file is left untouched.
      Logger.log('Stored SPREADSHEET_ID could not be opened: ' + err);
      spreadsheet = null;
    }
  }

  if (!spreadsheet) {
    // Reuse a spreadsheet of the same name if one is already in Drive, so a
    // cleared Script Property does not produce a duplicate.
    var found = findSpreadsheetByName_(SPREADSHEET_NAME);
    if (found) {
      spreadsheet = found;
    } else {
      spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
      created = true;
    }
    props.setProperty(PROP_SPREADSHEET_ID, spreadsheet.getId());
  }

  var report = [];
  for (var i = 0; i < SHEET_SCHEMA.length; i++) {
    report.push(ensureSheet_(spreadsheet, SHEET_SCHEMA[i]));
  }

  removeDefaultSheetIfUnused_(spreadsheet);

  var result = {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    created: created,
    sheets: report
  };

  Logger.log('Spreadsheet name : ' + SPREADSHEET_NAME);
  Logger.log('Spreadsheet ID   : ' + result.spreadsheetId);
  Logger.log('Spreadsheet URL  : ' + result.spreadsheetUrl);
  Logger.log('Newly created    : ' + created);
  Logger.log('Tabs             : ' + JSON.stringify(report, null, 2));
  Logger.log('');
  Logger.log('Copy the Spreadsheet ID above if you ever need to reconnect.');

  return result;
}

/**
 * Finds a spreadsheet in Drive by exact name. Returns null when absent.
 * @param {string} name
 * @return {Spreadsheet|null}
 */
function findSpreadsheetByName_(name) {
  var files = DriveApp.getFilesByName(name);
  while (files.hasNext()) {
    var file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return SpreadsheetApp.openById(file.getId());
    }
  }
  return null;
}

/**
 * Ensures one tab exists with the expected headers.
 *
 * Existing data is never touched: if the tab exists, only headers that are
 * missing from the end of the row are appended.
 *
 * @param {Spreadsheet} spreadsheet
 * @param {{name: string, headers: Array.<string>}} definition
 * @return {{sheet: string, action: string, headersAdded: number}}
 */
function ensureSheet_(spreadsheet, definition) {
  var sheet = spreadsheet.getSheetByName(definition.name);
  var action = 'reused';

  if (!sheet) {
    sheet = spreadsheet.insertSheet(definition.name);
    action = 'created';
  }

  var headers = definition.headers;
  var lastColumn = sheet.getLastColumn();
  var existing = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    : [];

  var headersAdded = 0;
  for (var i = 0; i < headers.length; i++) {
    var current = existing[i];
    if (current === undefined || current === null || String(current).trim() === '') {
      sheet.getRange(1, i + 1).setValue(headers[i]);
      headersAdded++;
    }
    // A header that exists but differs is left alone on purpose — renaming a
    // populated column would silently detach it from its data.
  }

  formatHeaderRow_(sheet, headers.length);
  applyPlainTextColumns_(sheet, definition.name, headers);

  return { sheet: definition.name, action: action, headersAdded: headersAdded };
}

/**
 * Forces plain-text formatting on columns Sheets would otherwise coerce, so an
 * all-digit password keeps its leading zeros and a month key stays a string
 * rather than silently becoming a date.
 *
 * Only applied while the tab has no data rows: re-formatting a populated column
 * would change how existing values display.
 *
 * @param {Sheet} sheet
 * @param {string} sheetName
 * @param {Array.<string>} headers
 */
function applyPlainTextColumns_(sheet, sheetName, headers) {
  var columns = PLAIN_TEXT_COLUMNS[sheetName];
  if (!columns || !columns.length) return;
  if (sheet.getLastRow() > 1) return;

  for (var i = 0; i < columns.length; i++) {
    var index = headers.indexOf(columns[i]);
    if (index < 0) continue;
    sheet
      .getRange(2, index + 1, Math.max(sheet.getMaxRows() - 1, 1), 1)
      .setNumberFormat('@');
  }
}

/**
 * Applies the standard header formatting: bold, tinted, frozen, auto-sized.
 * @param {Sheet} sheet
 * @param {number} columnCount
 */
function formatHeaderRow_(sheet, columnCount) {
  var header = sheet.getRange(1, 1, 1, columnCount);
  header
    .setFontWeight('bold')
    .setBackground('#247444')   // Bright Paper green
    .setFontColor('#ffffff')
    .setVerticalAlignment('middle');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, columnCount);
}

/**
 * Drops the default "Sheet1" that `SpreadsheetApp.create` leaves behind, but
 * only when it is empty and not one of our tabs.
 * @param {Spreadsheet} spreadsheet
 */
function removeDefaultSheetIfUnused_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName('Sheet1');
  if (!sheet) return;

  for (var i = 0; i < SHEET_SCHEMA.length; i++) {
    if (SHEET_SCHEMA[i].name === 'Sheet1') return;
  }
  if (sheet.getLastRow() > 0 || sheet.getLastColumn() > 0) return;
  if (spreadsheet.getSheets().length <= 1) return;

  spreadsheet.deleteSheet(sheet);
}

/**
 * Convenience helper: generates a random API key and stores it in Script
 * Properties. Copy the logged value into the Next.js `APPS_SCRIPT_API_KEY`.
 * Running this again rotates the key and invalidates the old one.
 *
 * @return {string} the generated key
 */
function generateApiKey() {
  var bytes = Utilities.getUuid() + Utilities.getUuid();
  var key = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
  ).replace(/=+$/, '');

  PropertiesService.getScriptProperties().setProperty(PROP_API_KEY, key);

  Logger.log('APPS_SCRIPT_API_KEY=' + key);
  Logger.log('Copy this into .env.local (and your Vercel environment).');
  return key;
}

/**
 * Prints the current configuration without revealing the API key.
 * Useful for confirming setup ran.
 */
function showConfig() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SPREADSHEET_ID);
  var key = props.getProperty(PROP_API_KEY);

  Logger.log('SPREADSHEET_ID : ' + (id || '(not set — run setupSpreadsheet)'));
  Logger.log('API_KEY        : ' + (key ? 'set (' + key.length + ' chars)' : '(not set — run generateApiKey)'));
  if (id) {
    Logger.log('URL            : ' + SpreadsheetApp.openById(id).getUrl());
  }
}
