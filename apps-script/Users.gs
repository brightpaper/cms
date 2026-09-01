/**
 * User and permission management.
 *
 * Every action here is reachable only through the Next.js admin routes, which
 * require a verified ADMIN session. The API key check in `Main.gs` is the
 * second gate; there is no public signup path.
 *
 * PASSWORDS: the `password` column is read only to write it back. It is never
 * placed in a response, never logged, and `toSafeUserRow_` is the single
 * projection used by every handler that returns a user.
 */

/** Boolean permission columns, in sheet order. Mirrors PERMISSION_FLAGS in TS. */
var PERMISSION_FLAG_COLUMNS = [
  'canViewAssignedParties',
  'canAddCollection',
  'canEditCollection',
  'canDeleteCollection',
  'canAddFollowUp',
  'canEditFollowUp',
  'canDeleteFollowUp',
  'canViewReports',
  'canExport'
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Projects a Users row to the fields safe to send onward.
 *
 * Deliberately enumerates its output rather than deleting `password` from a
 * copy: a new sheet column can never leak by being forgotten here.
 *
 * @param {Object} row
 * @return {Object}
 */
function toSafeUserRow_(row) {
  return {
    userId: String(row.userId || ''),
    username: normalizeUsername_(row.username),
    name: String(row.name || ''),
    role: String(row.role || '').trim().toLowerCase(),
    active: row.active === true,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null
  };
}

/**
 * Finds the 1-based sheet row for a userId.
 *
 * @param {string} userId
 * @return {{rowIndex: number, row: Object}}
 */
function findUserRowById_(userId) {
  var wanted = String(userId || '').trim();
  if (wanted === '') {
    throw new ApiException('VALIDATION_ERROR', 'A userId is required.');
  }

  var rows = readRows_(SHEET_NAMES.USERS, headersFor_(SHEET_NAMES.USERS));
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].userId || '').trim() === wanted) {
      // rows[] skips blank lines, so the sheet row is resolved by scanning the
      // userId column rather than assuming index alignment.
      return { rowIndex: findSheetRowByValue_(SHEET_NAMES.USERS, 'userId', wanted), row: rows[i] };
    }
  }
  throw new ApiException('NOT_FOUND', 'No user with that id.');
}

/**
 * Locates a sheet row number by matching one column's value.
 *
 * @param {string} sheetName
 * @param {string} header
 * @param {string} value
 * @return {number} 1-based row index
 */
function findSheetRowByValue_(sheetName, header, value) {
  var sheet = getSheet_(sheetName);
  var headers = headersFor_(sheetName);
  var column = headers.indexOf(header) + 1;
  if (column < 1) {
    throw new ApiException('NOT_FOUND', 'Column "' + header + '" is missing.');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new ApiException('NOT_FOUND', 'No rows to search.');

  var column_values = sheet.getRange(2, column, lastRow - 1, 1).getValues();
  for (var i = 0; i < column_values.length; i++) {
    if (String(column_values[i][0]).trim() === String(value).trim()) return i + 2;
  }
  throw new ApiException('NOT_FOUND', 'No row found for ' + header + ' ' + value + '.');
}

/** Writes one cell by header name. */
function setCell_(sheetName, rowIndex, header, value) {
  var headers = headersFor_(sheetName);
  var column = headers.indexOf(header) + 1;
  if (column < 1) {
    throw new ApiException('NOT_FOUND', 'Column "' + header + '" is missing.');
  }
  getSheet_(sheetName).getRange(rowIndex, column).setValue(value);
}

/** Validates and normalises a role, returning the sheet form. */
function normalizeRole_(role) {
  var upper = String(role || '').trim().toUpperCase();
  if (upper !== 'ADMIN' && upper !== 'SALESMAN') {
    throw new ApiException('VALIDATION_ERROR', 'Role must be ADMIN or SALESMAN.');
  }
  return upper;
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `users.list` — every account, without passwords.
 *
 * @return {Array.<Object>}
 */
function listUsers(payload) {
  var rows = readRows_(SHEET_NAMES.USERS, headersFor_(SHEET_NAMES.USERS));
  var safe = [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].userId || '').trim() === '') continue;
    safe.push(toSafeUserRow_(rows[i]));
  }

  if (payload && payload.role) {
    var role = String(payload.role).toLowerCase();
    safe = safe.filter(function (user) { return user.role === role; });
  }

  safe.sort(function (a, b) { return a.username.localeCompare(b.username); });
  return safe;
}

/**
 * `users.create` — adds an account.
 *
 * @param {{username: string, password: string, name: string, role: string, active: boolean=}} payload
 * @return {Object} the safe user
 */
function createUserAction(payload) {
  var username = payload && payload.username ? String(payload.username) : '';
  var password = payload && payload.password ? String(payload.password) : '';
  var name = payload && payload.name ? String(payload.name) : '';
  var role = normalizeRole_(payload && payload.role);

  // createUser_ enforces the username/password rules and rejects duplicates.
  var created = createUser_(username, password, name, role);

  if (payload && payload.active === false) {
    setUserActive({ userId: created.userId, active: false });
  }

  var found = findUserRowById_(created.userId);
  return toSafeUserRow_(found.row);
}

/**
 * `users.update` — edits name, username, role and optionally the password.
 *
 * @param {{userId: string, name: string=, username: string=, role: string=, password: string=}} payload
 * @return {Object} the safe user
 */
function updateUser(payload) {
  var userId = payload && payload.userId ? String(payload.userId) : '';
  var found = findUserRowById_(userId);
  var rowIndex = found.rowIndex;

  if (payload.username !== undefined && payload.username !== null) {
    var nextUsername = normalizeUsername_(payload.username);
    if (nextUsername === '') {
      throw new ApiException('VALIDATION_ERROR', 'Username is required.');
    }
    // Case-insensitive uniqueness, ignoring the user's own row.
    var clash = findUserByUsername_(nextUsername);
    if (clash && String(clash.userId).trim() !== String(userId).trim()) {
      throw new ApiException('CONFLICT', 'A user with that username already exists.');
    }
    setCell_(SHEET_NAMES.USERS, rowIndex, 'username', nextUsername);
  }

  if (payload.name !== undefined && payload.name !== null) {
    setCell_(SHEET_NAMES.USERS, rowIndex, 'name', String(payload.name).trim());
  }

  if (payload.role !== undefined && payload.role !== null) {
    setCell_(SHEET_NAMES.USERS, rowIndex, 'role', normalizeRole_(payload.role));
  }

  if (payload.password !== undefined && payload.password !== null && payload.password !== '') {
    var password = String(payload.password);
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ApiException(
        'VALIDATION_ERROR',
        'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.'
      );
    }
    // Written, never echoed back and never logged.
    setCell_(SHEET_NAMES.USERS, rowIndex, 'password', password);
  }

  setCell_(SHEET_NAMES.USERS, rowIndex, 'updatedAt', new Date().toISOString());
  SpreadsheetApp.flush();

  return toSafeUserRow_(findUserRowById_(userId).row);
}

/**
 * `users.setActive` — enables or disables sign-in for an account.
 *
 * @param {{userId: string, active: boolean}} payload
 * @return {Object} the safe user
 */
function setUserActive(payload) {
  var userId = payload && payload.userId ? String(payload.userId) : '';
  var found = findUserRowById_(userId);
  var active = toBoolean_(payload && payload.active);

  // Refuse to disable the last active admin, which would lock everyone out of
  // user management with no way back in through the app.
  if (!active && String(found.row.role || '').toLowerCase() === 'admin') {
    var admins = listUsers({ role: 'admin' }).filter(function (user) {
      return user.active === true && user.userId !== String(userId).trim();
    });
    if (admins.length === 0) {
      throw new ApiException(
        'VALIDATION_ERROR',
        'This is the only active admin. Promote another admin before deactivating this one.'
      );
    }
  }

  setCell_(SHEET_NAMES.USERS, found.rowIndex, 'active', active);
  setCell_(SHEET_NAMES.USERS, found.rowIndex, 'updatedAt', new Date().toISOString());
  SpreadsheetApp.flush();

  return toSafeUserRow_(findUserRowById_(userId).row);
}

/* -------------------------------------------------------------------------- */
/* Permissions                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `permissions.getEffective` — the stored flags for one user.
 *
 * A user with no Permissions row yet gets every flag false and `exists: false`,
 * so the admin sees exactly what is stored rather than an invented baseline.
 *
 * @param {{userId: string}} payload
 * @return {Object}
 */
function getEffectivePermissions(payload) {
  var userId = payload && payload.userId ? String(payload.userId).trim() : '';
  if (userId === '') {
    throw new ApiException('VALIDATION_ERROR', 'A userId is required.');
  }
  // Fails with NOT_FOUND if the user does not exist.
  findUserRowById_(userId);

  var rows = readRows_(SHEET_NAMES.PERMISSIONS, headersFor_(SHEET_NAMES.PERMISSIONS));
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].userId || '').trim() === userId) {
      var stored = {
        permissionId: String(rows[i].permissionId || ''),
        userId: userId,
        updatedAt: rows[i].updatedAt || null,
        exists: true
      };
      for (var f = 0; f < PERMISSION_FLAG_COLUMNS.length; f++) {
        var flag = PERMISSION_FLAG_COLUMNS[f];
        stored[flag] = rows[i][flag] === true;
      }
      return stored;
    }
  }

  var empty = { permissionId: '', userId: userId, updatedAt: null, exists: false };
  for (var k = 0; k < PERMISSION_FLAG_COLUMNS.length; k++) {
    empty[PERMISSION_FLAG_COLUMNS[k]] = false;
  }
  return empty;
}

/**
 * `permissions.update` — writes the flags for one user.
 *
 * Creates the Permissions row on first save, updates it thereafter. Only the
 * known flag columns are written; anything else in the payload is ignored.
 *
 * @param {{userId: string, permissions: Object}} payload
 * @return {Object} the stored permissions
 */
function updatePermissions(payload) {
  var userId = payload && payload.userId ? String(payload.userId).trim() : '';
  if (userId === '') {
    throw new ApiException('VALIDATION_ERROR', 'A userId is required.');
  }
  findUserRowById_(userId);

  var flags = (payload && payload.permissions) || {};
  var now = new Date().toISOString();
  var current = getEffectivePermissions({ userId: userId });

  var headers = headersFor_(SHEET_NAMES.PERMISSIONS);
  var sheet = getSheet_(SHEET_NAMES.PERMISSIONS);

  if (!current.exists) {
    var permissionId = 'PERM-' + Utilities.getUuid().split('-')[0].toUpperCase();
    var row = [];
    for (var h = 0; h < headers.length; h++) {
      var header = headers[h];
      if (header === 'permissionId') row.push(permissionId);
      else if (header === 'userId') row.push(userId);
      else if (header === 'updatedAt') row.push(now);
      else row.push(toBoolean_(flags[header]));
    }
    sheet.appendRow(row);
  } else {
    var rowIndex = findSheetRowByValue_(SHEET_NAMES.PERMISSIONS, 'userId', userId);
    for (var c = 0; c < PERMISSION_FLAG_COLUMNS.length; c++) {
      var flag = PERMISSION_FLAG_COLUMNS[c];
      // Absent keys keep their stored value rather than silently clearing.
      var next = flags[flag] === undefined ? current[flag] : toBoolean_(flags[flag]);
      setCell_(SHEET_NAMES.PERMISSIONS, rowIndex, flag, next);
    }
    setCell_(SHEET_NAMES.PERMISSIONS, rowIndex, 'updatedAt', now);
  }

  SpreadsheetApp.flush();
  return getEffectivePermissions({ userId: userId });
}
