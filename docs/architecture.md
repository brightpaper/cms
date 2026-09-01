# Architecture — Bright Paper Collection Management System

## The concepts, kept separate

| Concept | Tab | Written by | Mutability |
|---|---|---|---|
| H&S imported outstanding | `HNS_Outstanding` | Import job only (later step) | Replaced per import; never edited row-by-row |
| Parties | `Parties` | Admin | Editable master data |
| Party assignments | `PartyAssignments` | Admin | Append + deactivate, so history survives reassignment |
| Collections | `Collections` | Salesman / admin | Append-only transactions |
| Follow-ups | `FollowUps` | Salesman / admin | Append-only; earlier notes never overwritten |
| Users | `Users` | Admin | Plain-text `password`; never leaves Apps Script |
| Permissions | `Permissions` | Admin | Per-user boolean flags |
| Monthly reporting | `MonthlySummary` | Derived (later step) | Cache; structure only today |

The rule that drives the schema: **a collection transaction is never written
into an H&S outstanding row.** They are joined at read time on `hnsPartyCode` /
`partyId`. Re-importing the ERP export therefore cannot destroy collection or
follow-up history.

## Month-wise history

Every `Collections` row carries a `monthKey` (`YYYY-MM`) written once, at
creation, and never recalculated. `FollowUps` has no month column — its month is
derived from `followUpDate` at read time.

- Starting a new month means writing rows with a new key. **No new tab, no new
  spreadsheet, nothing archived, nothing deleted.**
- August stays in `Collections` forever; September is appended beside it.
- `reports.availablePeriods` returns the months that actually contain data,
  newest first, gathered from real rows and never from the calendar. An empty
  database returns `[]`.
- The UI filters by month through `?month=YYYY-MM` in the URL.

Month closing and read-only enforcement for past months are **not** implemented
yet; the schema simply supports them.

## Request path

```
                     browser                         |            server
                                                     |
Client Component --fetch /api/*----------------------|--> Route Handler --+
                                                     |                    |
Server Component ------------------------------------|-------------------}+--> service
                                                     |                    |      |
                                                     +--------------------+      v
                                                                     callAppsScript()
                                                                              |
                                                                              v
                                                            Apps Script doPost (+ API key)
                                                                              |
                                                                              v
                                                                      Google Sheets
```

The browser never calls Apps Script directly, because:

1. `APPS_SCRIPT_API_KEY` would be visible in the client bundle.
2. `/exec` answers cross-origin requests with a 302 to a `googleusercontent`
   host, which drops custom headers and breaks CORS preflight.

`src/lib/api/apps-script.ts` imports `server-only`, so an accidental client
import is a build error rather than a runtime leak.

Pages render as Server Components and call services directly (no client-side
waterfall). The `/api/*` handlers exist for client-side use and for testing.

## The RPC contract

Apps Script exposes **one** `doPost` endpoint that switches on `action`. Every
valid action string lives in `src/lib/api/actions.ts`; `handleAction_` in
`Main.gs` implements a subset.

Request envelope:

```jsonc
{ "action": "collections.list", "payload": { "monthKey": "2026-09" }, "apiKey": "..." }
```

Response envelope — always HTTP 200, because Apps Script cannot set status codes:

```jsonc
{ "ok": true,  "data": [] }
{ "ok": false, "error": { "code": "UNAUTHENTICATED", "message": "..." } }
```

`callAppsScript` narrows on `ok`, maps `code` onto a real HTTP status, and
throws `ApiError`. Route Handlers re-serialise it with `fail()`, so the browser
sees the same envelope end to end.

### Implemented actions (Step 2 — reads only)

| Action | Payload | Returns |
|---|---|---|
| `reports.availablePeriods` | `{ salesmanId? }` | `string[]` of `YYYY-MM`, newest first |
| `parties.list` | `{ salesmanId?, active?, search? }` | `Party[]` |
| `collections.list` | `{ monthKey?, partyId?, salesmanId? }` | `Collection[]` |
| `followUps.list` | `{ monthKey?, partyId?, salesmanId?, status? }` | `FollowUp[]` |

Any other action returns `NOT_IMPLEMENTED`. No write action exists yet.

`salesmanId` on `parties.list` resolves through `PartyAssignments`. It is a
**filter, not an authorisation boundary** — real scoping arrives with
authentication, enforced server-side from the session.

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `NOT_CONFIGURED` | 503 | `APPS_SCRIPT_URL`/`APPS_SCRIPT_API_KEY` missing, or `SPREADSHEET_ID` unset in Script Properties |
| `UNAUTHENTICATED` | 401 | Missing or wrong API key |
| `VALIDATION_ERROR` | 422 | Body absent, not JSON, or no `action` |
| `NOT_FOUND` | 404 | Tab missing — run `setupSpreadsheet()` |
| `NOT_IMPLEMENTED` | 501 | Action not built yet |
| `UPSTREAM_ERROR` | 502 | Apps Script unreachable, or returned non-JSON (usually a private deployment) |

## Setup

See [`apps-script/README.md`](../apps-script/README.md) for the full walkthrough:
creating the Apps Script project, running `setupSpreadsheet()`, generating the
API key, and deploying as a Web App.

### Spreadsheet

`setupSpreadsheet()` creates **"Bright Paper Collection System"** in your Drive
and stores its id in Script Properties as `SPREADSHEET_ID`. It is idempotent:

- an existing spreadsheet is reused (by stored id, then by name);
- an existing tab is reused;
- only headers missing from the end of row 1 are added;
- a header that exists but differs is left alone, because renaming a populated
  column would silently detach it from its data;
- no cell is ever cleared, no row deleted, no tab removed or duplicated.

### Exact headers

```
Users             userId | username | password | name | role | active | createdAt | updatedAt
Parties           partyId | hnsPartyCode | partyName | phone | address | city | active | createdAt | updatedAt
PartyAssignments  assignmentId | partyId | salesmanId | assignedAt | assignedBy | active
HNS_Outstanding   hnsPartyCode | partyName | billNo | billDate | creditDays | billAmount | receivedAmount | balanceAmount | dueDate | importDate
Collections       collectionId | partyId | salesmanId | amount | paymentDate | monthKey | paymentMode | referenceNo | remark | createdAt | updatedAt
FollowUps         followUpId | partyId | salesmanId | followUpDate | nextFollowUpDate | remark | status | createdAt | updatedAt
MonthlySummary    monthKey | salesmanId | totalDue | totalCollected | totalBalance | collectionPercentage | updatedAt
Permissions       permissionId | userId | canViewAssignedParties | canAddCollection | canEditCollection | canDeleteCollection | canAddFollowUp | canEditFollowUp | canDeleteFollowUp | canViewReports | canExport | updatedAt
```

`HNS_Outstanding` is deliberately extensible: any extra trailing column in the
real export is returned under `extra` instead of breaking the read.

### Cell coercion

`active` and every `can*` column read as booleans (`TRUE`, `yes`, `1` all work).
Amounts read as numbers, tolerating separators like `1,25,000.50`. Date columns
normalise to `YYYY-MM-DD` and `createdAt`/`updatedAt` to ISO 8601, in the
spreadsheet's timezone. Fully blank rows are skipped, so spacer rows are
harmless.

## Testing the backend

**In Apps Script** — run `showConfig()` to confirm `SPREADSHEET_ID` and
`API_KEY` are set, without printing the key itself.

**From a terminal**, against the deployed URL:

```bash
curl -L -X POST "$APPS_SCRIPT_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"action":"parties.list","payload":{},"apiKey":"YOUR_KEY"}'
```

Expect `{"ok":true,"data":[]}` on a fresh sheet. A wrong key must return
`{"ok":false,"error":{"code":"UNAUTHENTICATED",...}}`. The `-L` matters: Apps
Script redirects `/exec` to `googleusercontent.com`.

**Through Next.js**, with `.env.local` filled in and `npm run dev` running:

```bash
curl localhost:3000/api/parties
curl localhost:3000/api/reports/periods
curl "localhost:3000/api/collections?monthKey=2026-09"
curl "localhost:3000/api/follow-ups?monthKey=2026-09&status=open"
```

Unconfigured, these return HTTP 503 with `NOT_CONFIGURED`, and the pages render
a "backend not configured" panel instead of failing.

---

# Authentication (Step 3)

## Password storage

Passwords are stored **in plain text** in the `Users.password` column, by
explicit decision. Adding a user is adding a row; there is nothing to hash,
generate or reset through code.

The trade-off, stated plainly: **anyone who can open the spreadsheet can read
every password.** Access to the "Bright Paper Collection System" file is
therefore the security boundary — restrict sharing to the people who genuinely
need it, and tell staff not to reuse a password from their email or banking.

What is still enforced:

| Property | How |
|---|---|
| Password never leaves Apps Script | Comparison happens server-side; only `{userId, username, name, role}` is returned |
| Never in an API response | `toSafeUser_` projects the row and drops the password column |
| Never in HTML or the client bundle | Verified by test; the browser only ever posts it, never receives it |
| Never logged | `createUserFromProperties` logs the username and role only |
| No timing oracle | Constant-time comparison in `verifyPassword_` |
| No account enumeration | Unknown user, wrong password and disabled account all return one generic error |

Comparison is exact: case, spaces and symbols all matter. Usernames, by
contrast, are trimmed and lower-cased, so `  Ravi ` and `ravi` are the same
account. An all-digit password is compared as text, so a value Sheets stored as
a number still matches.

### Switching to hashed passwords later

Only two functions would change — `verifyPassword_` and `createUser_` in
`Auth.gs`. Nothing in Next.js, the session layer or the UI knows how the
password is stored, so the swap is contained to the Apps Script side plus a
one-off re-entry of each password.

## Where verification happens

Inside Apps Script, never in Next.js. The plaintext password is forwarded once
over TLS and compared against the sheet; the stored password never leaves Apps Script.

```
Browser -> POST /api/auth/login -> Next server -> users.authenticate (Apps Script)
        -> Users sheet -> verifyPassword_ -> safe user {userId, username, name, role}
        -> Next signs a session -> httpOnly cookie -> browser
```

`users.authenticate` returns one generic error — *"Invalid username or
password."* — for an unknown username, a wrong password **and** a deactivated
account, so the endpoint cannot be used to discover which accounts exist.

## Sessions

A stateless signed token. No session row is written to Sheets, so verification
is one local HMAC.

```
v1.<base64url(payload JSON)>.<base64url(HMAC-SHA256 of "v1.<payload>")>
```

Payload: `userId`, `username`, `name`, `role`, `issuedAt`, `expiresAt` — nothing
else. It is signed, not encrypted: readable by the cookie holder, but not
editable, which is what prevents a client from changing their own role.

- Signed with `SESSION_SECRET` (min 32 chars; the app refuses to sign otherwise)
- **Lifetime: 8 hours**, checked on every verification
- Signature compared with `timingSafeEqual`
- The `v1.` prefix is inside the signed material, so the version cannot be swapped

Rotating `SESSION_SECRET` invalidates every existing session immediately.

## Cookie

| Attribute | Value |
|---|---|
| Name | `bp_session` |
| `httpOnly` | `true` — unreadable by any script, so XSS cannot steal it |
| `secure` | `true` in production only, so `http://localhost` still works |
| `sameSite` | `lax` |
| `path` | `/` |
| `maxAge` | 28800s (8h) |

Nothing is stored in `localStorage` or `sessionStorage`, and no session value
ever appears in a URL.

## Route protection

Two independent layers:

1. **`src/proxy.ts`** (Next.js 16 Proxy, formerly Middleware — Node.js runtime,
   so `node:crypto` works). Matches `/admin*`, `/salesman*` and `/login`, and
   does the cheap part only: verify the cookie signature and expiry locally. No
   sheet reads.
2. **Layout guards** — `requireRole("admin")` / `requireRole("salesman")` in the
   two section layouts, so a page cannot render without a verified session even
   if the matcher were changed.

| Situation | Result |
|---|---|
| Anonymous → `/admin/*` or `/salesman/*` | 307 to `/login?next=…` |
| Salesman → `/admin/*` | 307 to `/salesman` |
| Admin → `/salesman/*` | 307 to `/admin` |
| Signed in → `/login` | 307 to their role home |
| Anonymous → `/login` | 200 |

A wrong-role user is sent to *their own* home rather than to `/login`, which
would bounce them straight back and loop. The role always comes from the
verified payload, so a query string, body field or header cannot influence it.

`?next=` is only followed when it is a same-origin relative path, so it cannot
be used as an open redirect.

## Logout

`POST /api/auth/logout` re-sets the cookie with `Max-Age=0`.

Because sessions are stateless, a token copied elsewhere before logout stays
valid until `expiresAt`. Immediate global revocation would need a server-side
denylist, which is out of scope for this step.

## What Step 3 does *not* do

Salesman data scoping is **not** enforced yet: `parties.list`,
`collections.list` and `followUps.list` still return everything. A signed-in
salesman sees all data. Enforcement belongs to the authorization/assignment
step, and must happen in Apps Script, driven by the session identity — not by a
client-supplied `salesmanId`.

---

# H&S outstanding import (Step 4)

## What the export actually looks like

Verified against a live export (`01 DATE AND PARTY WISE OUTSTANDING`, 1122
lines, 155 parties, 809 detail rows). It is a **report, not a table**:

```
line 1   01 DATE AND PARTY  WISE OUTSTANDING,,,,,,,,,,,,          <- title
line 2   bill,,crdays,bill_dat,billamt,lockdays,rec_amt,Bal_Amt,   <- headers
         Pending_Days,lockoverdue,duedat,ActualDays,ActualDueDat
         A H PACKING ,,,,,,,,,,,,                                  <- party header
         ,D000350,30,12-06-2026,571834,40,46718,525116,...         <- bill row
         ,,,,"9,67,300.00",,"46,718.00",920582.,,,,,               <- party subtotal
last     ,,,,"28,64,13,981.00",,"2,22,45,155.00","26,41,68,211.00" <- grand total
```

Two headings are misleading and worth stating plainly: column 1 is headed
`bill` but carries the **party name** as a group header, and the column that
actually holds the **bill number** has no heading at all.

| Export column | Position | Maps to `HNS_Outstanding` | Notes |
|---|---|---|---|
| `bill` (col 1) | 0 | `partyName` | Group header, repeated onto each bill row |
| *(unnamed)* | 1 | `billNo` | Blank on 21 of 809 rows |
| `crdays` | 2 | `creditDays` | |
| `bill_dat` | 3 | `billDate` | `DD-MM-YYYY`; `01-01-1900` means "none" |
| `billamt` | 4 | `billAmount` | |
| `lockdays` | 5 | *not imported* | |
| `rec_amt` | 6 | `receivedAmount` | |
| `Bal_Amt` | 7 | `balanceAmount` | Can be **negative** (22 rows) |
| `Pending_Days` | 8 | *not imported* | Derivable |
| `lockoverdue` | 9 | *not imported* | |
| `duedat` | 10 | `dueDate` | `DD-MM-YYYY` |
| `ActualDays` | 11 | *not imported* | |
| `ActualDueDat` | 12 | *not imported* | |
| — | — | `hnsPartyCode` | **Not in the export**; resolved by party-name match |
| — | — | `importDate` | Stamped server-side at import |

The four unimported columns are report-side derivations, not source data. The
existing header schema was preserved; nothing needed to change.

## Import strategy: snapshot replace

Each import **clears the `HNS_Outstanding` data rows and writes the new
snapshot**. It is not a row-level upsert, and that is forced by the data:

- Bill numbers are not unique. Three parties carry two `NEFT` rows each that are
  identical in every field except the amounts.
- 21 rows have no bill number at all.
- `hnsPartyCode + billNo`, the natural key, therefore cannot address a row.

Any upsert would either merge genuinely distinct rows or duplicate them on every
import. A snapshot replace is also what the data *means*: the export is the
current outstanding position, not an event log.

Practical consequence: **there is no history of past outstanding snapshots.**
Only the latest import is stored. History lives in `Collections`, which the
import never touches.

## Separation from Collections

`Import.gs` opens exactly two tabs: `Parties` (read-only, to resolve party
codes) and `HNS_Outstanding` (write). `assertOutstandingSheet_` makes that
structural rather than a promise. `Collections`, `FollowUps` and
`MonthlySummary` are never named in that file, and a test asserts all three are
byte-identical before and after repeated imports.

No collection entry is ever created from an import, and no outstanding amount is
copied into `Collections`.

## Party linking

The export has no party code, so linking is by **name**: upper-cased and
whitespace-collapsed, matched against `Parties.partyName`.

- Matched -> the party's `hnsPartyCode` is written onto the row.
- Unmatched -> the row still imports, with a blank code, and the party is listed
  for the admin in both the preview and the result.
- **No party is ever created by an import.**

Name matching is weaker than a code, and it is the one place this design is
soft: renaming a party in H&S breaks the link until `Parties` is updated. If H&S
can be made to export a party code, adding it to the file and mapping it to
`hnsPartyCode` would be a strict improvement.

## Flow

```
Admin -> choose file  -> POST /api/admin/outstanding/preview  (parse+validate, writes nothing)
      -> review rows, errors, warnings, unmatched parties
      -> Confirm      -> POST /api/admin/outstanding/import   (re-parses, then writes)
                      -> Apps Script outstanding.import       -> HNS_Outstanding
```

The file is re-parsed server-side on import rather than trusting rows posted
back from the browser, and **any validation error aborts the whole import** — the
sheet is only touched once a fully validated block of values exists, so a bad
file can never leave a partial snapshot.

Both routes require an authenticated **ADMIN** session via `requireApiRole`.
A salesman receives 403; an anonymous caller receives 401.

## File format: Excel uploaded directly

The admin uploads the H&S export **as it comes out of the ERP** — both legacy
`.xls` (OLE2/BIFF) and modern `.xlsx` are read directly. No conversion step.

### Parser choice

`.xls` is the constraint. **ExcelJS** and **read-excel-file** are both
`.xlsx`-only, so neither can read the legacy binary format H&S produces.
SheetJS is the only viable reader — but its npm package stopped at `0.18.5`,
which carries a prototype-pollution advisory (fixed in 0.19.3) and a ReDoS
advisory (fixed in 0.20.2).

SheetJS's **maintained distribution is the vendor's own CDN**, not npm. So the
dependency is installed from source:

```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

- **0.20.3 post-dates both advisories**; `npm audit` reports 0 vulnerabilities.
- The exact version is pinned in the URL, and `package-lock.json` records a
  **sha512 integrity hash**, so a later fetch of a changed tarball fails the
  install rather than silently substituting code.
- This is the vendor's documented install method, not a third-party mirror.

If SheetJS ever returns to npm, only the `package.json` line changes.

### How the workbook is read

`src/lib/import/excel-reader.ts` is the only file that imports SheetJS, and it
is `server-only`: parsing happens inside an admin-authenticated Route Handler,
never in the browser. Formula, style and VBA parsing are switched off, so a
legacy `.xls` macro payload is never evaluated.

The format is decided from the file's **leading bytes** (`D0CF11E0` for `.xls`,
`504B0304` for `.xlsx`), not its extension, so a renamed file is rejected rather
than half-parsed. The extension is checked too, for a clearer error message.

Only the **first worksheet** is read. Every cell is flattened to the same
textual form the CSV export produces, so the row-classification and validation
logic is shared byte-for-byte between the Excel and CSV paths — a test asserts
the two produce identical rows from the same report.

> **The timezone trap.** SheetJS builds `Date` objects in the runtime's local
> zone. Calling `toISOString()` on them re-interprets those as UTC and shifts
> every date back a day in any zone east of Greenwich — silently turning
> 12-06-2026 into 11-06-2026 here. `formatSheetDate` therefore reads local date
> components. A test pins this.

### Columns are located by header name

Two live H&S reports were compared and their column orders differ entirely:

```
report A:  bill      | (blank) | crdays | bill_dat | billamt | ...
report B:  Bill Date | (blank) | bill   | billamt  | CrNoteDocNo | ...
```

So fixed positions cannot be trusted. `resolveColumns` finds each field by
header name, with aliases. Both reports share one structural quirk: column 1 is
reserved for the party group header, and the generator writes the *first*
header one column left of the data it labels — so a header at index 0 addresses
data at index 1. Both layouts parse with zero errors and totals that reconcile.

---

# Users & permissions (Step 5)

`/admin/users` is backed by the `Users` and `Permissions` sheets through six
Apps Script actions: `users.list`, `users.create`, `users.update`,
`users.setActive`, `permissions.getEffective`, `permissions.update`.

## Password handling

Passwords stay write-only end to end. `toSafeUserRow_` in `Users.gs` is the one
projection every handler returns, and it **enumerates its output fields** rather
than deleting `password` from a copy — so a future sheet column cannot leak by
being forgotten. A password can be *set* via `users.create` and `users.update`,
and is never read back, never logged, and never placed in a URL.

## Access control

Two independent gates, both server-side:

1. Each `/api/admin/users*` Route Handler calls `requireApiRole("admin")`, which
   reads the role from the **signed session cookie** — never from the body,
   query string or a header. A salesman gets 403, an anonymous caller 401.
2. Apps Script still requires the shared API key, which never reaches the
   browser. There is no public signup path.

`users.create` is reachable as an action now, which it was not before. That is
deliberate, and the protection is unchanged: the browser has no API key and
cannot address Apps Script. The editor-only helpers (`createUser_`,
`createUserFromProperties`) remain undispatchable.

## Rules enforced in Apps Script

- Usernames are trimmed and lower-cased; uniqueness is case-insensitive, and a
  rename that collides with another account is rejected with `CONFLICT`.
  Renaming a user to their *own* current username is allowed.
- Passwords are exact — case and spaces preserved — minimum 6 characters.
- Roles must be `ADMIN` or `SALESMAN`; the sheet stores upper case, the app uses
  lower case.
- **The last active admin cannot be deactivated.** Without this, disabling the
  only admin would lock everyone out of user management with no way back in
  through the app. The UI additionally prevents deactivating your own account.

## Permission flags

Nine boolean columns on the `Permissions` sheet, one row per user, created on
first save. A user with no row yet reads back as all-false with `exists: false`,
so the admin sees what is actually stored rather than an invented baseline. On
update, an omitted flag keeps its stored value rather than silently clearing,
and only the nine known flag names are written — an unexpected key in the
request body cannot reach the sheet.

**These flags are not enforced anywhere yet.** They are stored and editable;
enforcement belongs to the salesman-scoping step, and the dialog says so rather
than implying the flags already restrict anything.

---

# Read caching and perceived speed

Every screen waits on Google Apps Script, which costs roughly **2–5 seconds per
call** — measured against the live deployment, not estimated. Three layers deal
with that, and they solve different problems.

## 1. Loading boundaries (feedback)

`src/app/admin/loading.tsx` and `src/app/salesman/loading.tsx` render
`PageSkeleton`. They sit inside the section layout, so the sidebar and top bar
stay put and only the content area swaps.

Without them Next blocks the whole navigation and the browser keeps showing the
**previous** page — for seconds, with no indication anything is happening.
Measured against a 2.5s backend: first paint went from 2,500ms to ~10ms.

## 2. Server-side read cache (`src/lib/api/cache.ts`)

Every list read is wrapped in `cachedRead`, a thin `unstable_cache` wrapper with
a 30-second TTL and a cache tag. Measured, same 2.5s backend:

| | First visit | Revisit |
|---|---|---|
| `/admin/parties` | 2,594 ms | **19 ms** |
| `/admin/collections` | 2,552 ms | **21 ms** |
| `/admin/users` | 2,530 ms | **17 ms** |

**The trade-off, stated plainly:** a row edited *directly in the spreadsheet*
can take up to 30 seconds to appear. Writes made **through the app** have no
such delay — each write route calls `revalidateTag(tag, { expire: 0 })`, which
forbids serving stale content, so the very next read blocks on fresh data. This
is verified: importing a different H&S report immediately swaps the displayed
total, with no trace of the previous one.

Errors are never cached, so an unreachable or unconfigured backend retries on
the next request instead of being stuck for the window.

> **Important for the salesman-scoping step.** The cache key is the action plus
> its arguments — it does **not** include the session. That is safe today only
> because no read is scoped per user. When scoping arrives, the `salesmanId`
> must be passed in as an *argument* so it forms part of the key. Deriving it
> from the session *inside* a cached function would serve one salesman's rows to
> another.

## 3. Client router cache (`next.config.ts`)

`experimental.staleTimes.dynamic = 30` re-enables the client-side router cache
that Next 15 defaulted to 0. Navigating back to a page you just visited reuses
the cached payload instead of re-rendering it.
