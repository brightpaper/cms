/**
 * Authentication against the Users sheet.
 *
 * PASSWORD STORAGE: plain text, by explicit decision.
 *
 * The `password` column holds the password exactly as typed, so adding a user
 * is just adding a row. The consequence, stated plainly: anyone who can open
 * the spreadsheet can read every password. Restrict sharing on the
 * "Bright Paper Collection System" file to the people who genuinely need it,
 * and tell staff not to reuse a password they use for email or banking.
 *
 * What is still protected:
 *  - the password is compared inside Apps Script and never sent onward;
 *  - no API response, HTML page or log line ever contains it;
 *  - the comparison is constant-time;
 *  - unknown user, wrong password and disabled account are indistinguishable.
 */

/** Script Property names used only by the optional setup helpers. */
var PROP_SETUP_USERNAME = 'SETUP_USERNAME';
var PROP_SETUP_PASSWORD = 'SETUP_PASSWORD';
var PROP_SETUP_NAME = 'SETUP_NAME';
var PROP_SETUP_ROLE = 'SETUP_ROLE';

/** Minimum password length accepted when creating a user. */
var MIN_PASSWORD_LENGTH = 6;

/* -------------------------------------------------------------------------- */
/* Password check                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Compares a submitted password against the stored one.
 *
 * Uses a constant-time comparison so response timing does not reveal how much
 * of the password was correct.
 *
 * @param {*} submitted
 * @param {*} stored value of the `password` cell
 * @return {boolean}
 */
function verifyPassword_(submitted, stored) {
  if (submitted === null || submitted === undefined) return false;
  if (stored === null || stored === undefined) return false;

  // Sheets turns an all-digit password into a number; compare as text.
  var a = String(submitted);
  var b = String(stored);
  if (a === '' || b === '') return false;

  return constantTimeEqualsStrings_(a, b);
}

/**
 * Length-safe string comparison that does not exit on the first mismatch.
 *
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
function constantTimeEqualsStrings_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return diff === 0;
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Username normalisation rule: trim surrounding whitespace, collapse to lower
 * case. Applied on both creation and login, so "  Ravi " and "ravi" are the
 * same account and duplicates cannot be created by casing alone.
 *
 * Passwords are NOT normalised — they stay exactly as typed, including case
 * and spaces.
 *
 * @param {*} value
 * @return {string}
 */
function normalizeUsername_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toLowerCase();
}

/**
 * Finds a user row by normalised username.
 *
 * @param {string} username
 * @return {Object|null} the raw row, including the password column
 */
function findUserByUsername_(username) {
  var wanted = normalizeUsername_(username);
  if (wanted === '') return null;

  var rows = readRows_(SHEET_NAMES.USERS, headersFor_(SHEET_NAMES.USERS));
  for (var i = 0; i < rows.length; i++) {
    if (normalizeUsername_(rows[i].username) === wanted) return rows[i];
  }
  return null;
}

/**
 * Projects a user row down to the fields that are safe to send onward.
 * Deliberately never includes the password.
 *
 * @param {Object} row
 * @return {{userId: string, username: string, name: string, role: string}}
 */
function toSafeUser_(row) {
  return {
    userId: String(row.userId || ''),
    username: normalizeUsername_(row.username),
    name: String(row.name || ''),
    // The app uses lower-case roles; the sheet stores ADMIN / SALESMAN.
    role: String(row.role || '').trim().toLowerCase()
  };
}

/**
 * Appends a new user. Editor-only — never reachable through doPost.
 *
 * Adding a row directly in the Users tab does exactly the same thing; this
 * helper just fills in the id and timestamps and rejects duplicates.
 *
 * @param {string} username
 * @param {string} password
 * @param {string} name
 * @param {string} role ADMIN or SALESMAN
 * @return {{userId: string, username: string, role: string}}
 */
function createUser_(username, password, name, role) {
  var normalized = normalizeUsername_(username);
  if (normalized === '') {
    throw new ApiException('VALIDATION_ERROR', 'Username is required.');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiException(
      'VALIDATION_ERROR',
      'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.'
    );
  }

  var upperRole = String(role || '').trim().toUpperCase();
  if (upperRole !== 'ADMIN' && upperRole !== 'SALESMAN') {
    throw new ApiException('VALIDATION_ERROR', 'Role must be ADMIN or SALESMAN.');
  }
  if (findUserByUsername_(normalized)) {
    throw new ApiException('CONFLICT', 'A user with that username already exists.');
  }

  var sheet = getSheet_(SHEET_NAMES.USERS);
  var now = new Date().toISOString();
  var userId = 'U-' + Utilities.getUuid().split('-')[0].toUpperCase();

  // Column order must match SHEET_SCHEMA for Users.
  sheet.appendRow([
    userId,
    normalized,
    password,
    String(name || normalized),
    upperRole,
    true,
    now,
    now
  ]);

  return { userId: userId, username: normalized, role: upperRole };
}

/* -------------------------------------------------------------------------- */
/* Action handler                                                              */
/* -------------------------------------------------------------------------- */

/**
 * `users.authenticate` — the only authentication entry point.
 *
 * Every failure path returns the same generic message, so the response cannot
 * be used to discover which usernames exist or which accounts are disabled.
 *
 * @param {{username: string, password: string}} payload
 * @return {{userId: string, username: string, name: string, role: string}}
 */
function authenticateUser(payload) {
  var username = payload && payload.username ? String(payload.username) : '';
  var password = payload && payload.password ? String(payload.password) : '';

  if (normalizeUsername_(username) === '' || password === '') {
    throw new ApiException('UNAUTHENTICATED', 'Invalid username or password.');
  }

  var row = findUserByUsername_(username);

  // Unknown user, inactive user and wrong password are deliberately
  // indistinguishable from the caller's point of view.
  if (!row || row.active !== true || !verifyPassword_(password, row.password)) {
    throw new ApiException('UNAUTHENTICATED', 'Invalid username or password.');
  }

  var safe = toSafeUser_(row);
  if (safe.role !== 'admin' && safe.role !== 'salesman') {
    throw new ApiException('UNAUTHENTICATED', 'Invalid username or password.');
  }

  return safe;
}

/* -------------------------------------------------------------------------- */
/* Optional setup helpers (editor only)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Creates one user from temporary Script Properties, then deletes them.
 *
 * Optional: with plain-text storage you can simply add a row to the Users tab.
 * Use this when you would rather not type into the sheet by hand, or want the
 * duplicate check and generated id.
 *
 * Set these under Project Settings > Script Properties first:
 *   SETUP_USERNAME, SETUP_PASSWORD, SETUP_NAME (optional), SETUP_ROLE
 *
 * The properties are cleared afterwards either way.
 *
 * @return {Object} the created user, without the password
 */
function createUserFromProperties() {
  var props = PropertiesService.getScriptProperties();

  var username = props.getProperty(PROP_SETUP_USERNAME);
  var password = props.getProperty(PROP_SETUP_PASSWORD);
  var name = props.getProperty(PROP_SETUP_NAME);
  var role = props.getProperty(PROP_SETUP_ROLE);

  if (!username || !password || !role) {
    throw new Error(
      'Set SETUP_USERNAME, SETUP_PASSWORD and SETUP_ROLE in Script Properties first ' +
      '(SETUP_NAME is optional).'
    );
  }

  var created;
  try {
    created = createUser_(username, password, name, role);
  } finally {
    props.deleteProperty(PROP_SETUP_USERNAME);
    props.deleteProperty(PROP_SETUP_PASSWORD);
    props.deleteProperty(PROP_SETUP_NAME);
    props.deleteProperty(PROP_SETUP_ROLE);
  }

  // Never log the password.
  Logger.log('Created user: ' + created.username + ' (' + created.role + '), id ' + created.userId);
  Logger.log('Setup properties have been cleared.');
  return created;
}
