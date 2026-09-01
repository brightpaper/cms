/**
 * HTTP entry point.
 *
 * Only the Next.js server calls this endpoint, and every call carries the
 * shared API key. The browser never reaches Apps Script directly.
 *
 * Request body:
 *   { "action": "parties.list", "payload": {}, "apiKey": "..." }
 *
 * Response body (always HTTP 200 — Apps Script cannot set status codes):
 *   { "ok": true,  "data": ... }
 *   { "ok": false, "error": { "code": "...", "message": "..." } }
 */

/**
 * Structured error carrying a machine-readable code.
 *
 * Inherits from Error so it stringifies usefully in the execution log and
 * behaves like a normal throwable; `name` is still checked by errorResponse_.
 *
 * @param {string} code
 * @param {string} message
 * @constructor
 * @extends {Error}
 */
function ApiException(code, message) {
  this.code = code;
  this.message = message;
  this.name = 'ApiException';
  this.stack = new Error(message).stack;
}
ApiException.prototype = Object.create(Error.prototype);
ApiException.prototype.constructor = ApiException;

/**
 * @param {Object} e Apps Script POST event
 * @return {TextOutput}
 */
function doPost(e) {
  try {
    var request = parseRequest_(e);
    authenticateApiRequest_(request);
    var data = handleAction_(request.action, request.payload);
    return jsonResponse_({ ok: true, data: data });
  } catch (err) {
    return errorResponse_(err);
  }
}

/**
 * GET is intentionally not a data endpoint — it only reports liveness, so
 * opening the web app URL in a browser gives a useful signal without exposing
 * anything. No API key means no data.
 *
 * @return {TextOutput}
 */
function doGet() {
  return jsonResponse_({
    ok: true,
    data: { service: 'Bright Paper Collection System', status: 'ready' }
  });
}

/**
 * Validates and decodes the request envelope.
 * @param {Object} e
 * @return {{action: string, payload: Object, apiKey: string}}
 */
function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new ApiException('VALIDATION_ERROR', 'Request body is missing.');
  }

  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    throw new ApiException('VALIDATION_ERROR', 'Request body is not valid JSON.');
  }

  if (!body || typeof body.action !== 'string' || body.action === '') {
    throw new ApiException('VALIDATION_ERROR', 'Missing "action".');
  }

  return {
    action: body.action,
    payload: body.payload && typeof body.payload === 'object' ? body.payload : {},
    apiKey: typeof body.apiKey === 'string' ? body.apiKey : ''
  };
}

/**
 * Rejects any caller that does not present the configured shared key.
 * @param {{apiKey: string}} request
 */
function authenticateApiRequest_(request) {
  var expected = PropertiesService.getScriptProperties().getProperty(PROP_API_KEY);

  if (!expected) {
    throw new ApiException(
      'NOT_CONFIGURED',
      'API_KEY is not set in Script Properties. Run generateApiKey() once.'
    );
  }
  if (!request.apiKey || !constantTimeEquals_(request.apiKey, expected)) {
    throw new ApiException('UNAUTHENTICATED', 'Invalid or missing API key.');
  }
}

/**
 * Length-safe comparison that does not short-circuit on the first differing
 * character, so a caller cannot time their way to the key.
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Dispatches to the handler for an action name.
 *
 * Action names come from `src/lib/api/actions.ts` in the Next.js project;
 * only the read actions of Step 2 are wired up.
 *
 * @param {string} action
 * @param {Object} payload
 * @return {*}
 */
function handleAction_(action, payload) {
  switch (action) {
    case 'reports.availablePeriods':
      return getAvailablePeriods(payload);
    case 'parties.list':
      return getParties(payload);
    case 'collections.list':
      return getCollections(payload);
    case 'followUps.list':
      return getFollowUps(payload);
    case 'users.authenticate':
      return authenticateUser(payload);
    case 'outstanding.list':
      return getOutstanding(payload);
    case 'outstanding.import':
      return importOutstanding(payload);
    case 'users.list':
      return listUsers(payload);
    case 'users.create':
      return createUserAction(payload);
    case 'users.update':
      return updateUser(payload);
    case 'users.setActive':
      return setUserActive(payload);
    case 'permissions.getEffective':
      return getEffectivePermissions(payload);
    case 'permissions.update':
      return updatePermissions(payload);
    default:
      throw new ApiException(
        'NOT_IMPLEMENTED',
        'Action "' + action + '" is not implemented in this deployment.'
      );
  }
}

/**
 * @param {Object} body
 * @return {TextOutput}
 */
function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Converts any thrown value into the standard error envelope.
 * @param {*} err
 * @return {TextOutput}
 */
function errorResponse_(err) {
  var code = 'UNKNOWN';
  var message = 'An unexpected error occurred.';

  if (err && err.name === 'ApiException') {
    code = err.code;
    message = err.message;
  } else if (err) {
    // Log the real detail for the developer; return something generic.
    Logger.log('Unhandled error: ' + (err.stack || err));
    message = String(err.message || err);
  }

  return jsonResponse_({ ok: false, error: { code: code, message: message } });
}
