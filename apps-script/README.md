# Apps Script backend

The `.gs` files in this folder are the entire backend. They are **not** bundled
by Next.js — you paste them into a Google Apps Script project.

| File | Responsibility |
|---|---|
| `Config.gs` | Tab names, header schema, column type maps. Mirrors `src/config/constants.ts`. |
| `Setup.gs` | `setupSpreadsheet()`, `generateApiKey()`, `showConfig()`. |
| `SheetsLib.gs` | Opening sheets, reading rows, coercing cell values. |
| `Actions.gs` | The four read actions. |
| `Main.gs` | `doPost`, API-key check, dispatch, JSON envelopes. |

Paste order does not matter — Apps Script shares one global scope across files.

## First-time setup

1. Go to <https://script.google.com> → **New project**. Rename it
   *Bright Paper CMS Backend*.
2. For each file above, **＋ → Script**, name it exactly as shown (Apps Script
   adds the `.gs` itself), and paste the contents. Delete the default
   `Code.gs` once you have added `Main.gs`.
3. Select **`setupSpreadsheet`** in the function dropdown → **Run**.
   Approve the permission prompt (Drive + Sheets) the first time.
4. Open **Execution log**. It prints the spreadsheet name, ID and URL.
5. Select **`generateApiKey`** → **Run**. Copy the logged
   `APPS_SCRIPT_API_KEY=...` value.
6. **Deploy → New deployment → Web app**
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - Copy the `/exec` URL.

> *Who has access: Anyone* means anyone who knows the URL can POST to it —
> which is why every request must carry the API key. Without a valid key the
> endpoint returns `UNAUTHENTICATED` and touches no data.

7. Put the `/exec` URL and the key into `.env.local` in the Next.js project as
   `APPS_SCRIPT_URL` and `APPS_SCRIPT_API_KEY`.

Re-running `setupSpreadsheet()` is safe: it reuses the existing spreadsheet and
tabs, adds only missing headers, and never clears a cell or deletes a row.

## Re-deploying after a code change

Apps Script serves the **deployed version**, not the editor contents. After
editing, use **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**
to keep the same URL.

---

## Creating users (Step 3)

There is no sign-up page and no public account-creation endpoint. `doPost` only
routes the four read actions plus `users.authenticate`; `createUser_` is not
reachable from the web app at all.

> **Passwords are stored in plain text**, by explicit decision. Anyone who can
> open the spreadsheet can read every password. Keep sharing on
> "Bright Paper Collection System" restricted to people who genuinely need it,
> and tell staff not to reuse a password from their email or banking.

### Add a user

Open the **Users** tab and add a row:

| userId | username | password | name | role | active | createdAt | updatedAt |
|---|---|---|---|---|---|---|---|
| `U-001` | `ravi` | `Bright@2026` | Ravi Patel | `ADMIN` | `TRUE` | | |

- `userId` — any unique value you like; it is what other sheets reference.
- `username` — matched case-insensitively and trimmed, so `Ravi` and `ravi`
  are the same account.
- `password` — used exactly as typed. Case, spaces and symbols all matter.
- `role` — `ADMIN` or `SALESMAN` (upper case).
- `active` — `TRUE` to allow sign-in, `FALSE` to disable.
- `createdAt` / `updatedAt` — optional; leave blank.

Repeat for the two salesmen with `role` = `SALESMAN`. That is the whole
procedure — nothing to run.

> If you type an all-digit password, make sure the cell is formatted as plain
> text so Sheets does not strip leading zeros. `setupSpreadsheet()` sets that
> format automatically on a freshly created Users tab.

### Optional helper

`createUserFromProperties()` does the same thing with a generated id, timestamps
and a duplicate check. Add `SETUP_USERNAME`, `SETUP_PASSWORD`, `SETUP_NAME` and
`SETUP_ROLE` under **Project Settings → Script Properties**, run the function,
and the properties are cleared afterwards either way. The password is never
written to the execution log.

### Verify

Run **`listUsersSummary`** — it logs userId, username, name, role and active for
every account, and never the passwords.

### Change a password

Edit the `password` cell. It takes effect on the next sign-in; existing sessions
stay valid until they expire (8 hours), so sign the user out if that matters.

### Activate / deactivate a user

Set the `active` cell to `TRUE` or `FALSE`. A deactivated user cannot sign in
and receives exactly the same generic error as a wrong password.

> After editing any `.gs` file, redeploy: **Deploy → Manage deployments → ✏️ →
> Version: New version → Deploy.**

---

## H&S outstanding import (Step 4)

`Import.gs` adds two actions: `outstanding.list` and `outstanding.import`.

**It writes to `HNS_Outstanding` and nothing else.** `Parties` is read to
resolve party codes; `Collections`, `FollowUps` and `MonthlySummary` are never
opened by that file.

Each import **replaces** the snapshot: existing data rows are cleared and the
new export is written in full. Bill numbers in the real export are not unique
(three parties have two identical `NEFT` rows) and 21 rows have no bill number,
so rows cannot be addressed individually — replace is the only safe strategy.
Only the latest snapshot is kept.

The admin uploads the H&S .xls / .xlsx directly; no conversion step.
No extra setup is needed beyond adding `Import.gs` and redeploying. Nothing in
the import path can be triggered without the API key, and the Next.js routes in
front of it require an ADMIN session.
