# Service layer

Each file here is the **server-side domain contract** for one concept. Services
are the only place allowed to talk to `@/lib/api/apps-script`; UI components
never import the transport directly.

Call path:

```
Client Component ──fetch──> /api/* Route Handler ──> service ──> callAppsScript ──> Apps Script ──> Google Sheets
Server Component ─────────────────────────────────> service ──> callAppsScript ──> Apps Script ──> Google Sheets
```

Every function currently ends in `notImplemented(...)`. Wiring the backend means
replacing that one line with `callAppsScript(API_ACTIONS.x.y, payload, { actor })`.
No signature, type or caller changes.

Scoping rule: filters carry an optional `salesmanId`, but a salesman's own
requests are **always** re-scoped server-side from the session. The client is
never trusted to limit its own visibility.
