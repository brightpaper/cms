# Bright Paper — Collection Management System

Web front end for party-wise outstanding, collections, follow-ups and month-wise
reporting, backed by Google Sheets through a Google Apps Script API layer.

- **Next.js 16** (App Router) + **TypeScript** (strict) + **Tailwind CSS v4** + **shadcn/ui**
- **Google Sheets** as the database, **Google Apps Script** as the backend/API
- Deploys to **Vercel**

No SQL/NoSQL database is used, and none should be introduced.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs without a backend: every data screen shows a "backend not
configured" panel instead of failing. To connect real data, follow
[`apps-script/README.md`](apps-script/README.md) — create the Apps Script
project, run `setupSpreadsheet()`, run `generateApiKey()`, deploy as a Web App,
then fill in `APPS_SCRIPT_URL` and `APPS_SCRIPT_API_KEY` in `.env.local`.

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | Regenerate route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |

## Project layout

```
apps-script/                Google Apps Script backend (pasted into script.google.com)
├── Config.gs               Tab names, header schema, column type maps
├── Setup.gs                setupSpreadsheet, generateApiKey, showConfig
├── SheetsLib.gs            Sheet access, row reading, cell coercion
├── Actions.gs              The four read actions
├── Auth.gs                 Password check, users.authenticate, user setup helpers
├── Users.gs                User CRUD + permission flags (admin only)
├── Import.gs               H&S outstanding snapshot import (HNS_Outstanding only)
└── Main.gs                 doPost, API-key check, dispatch, JSON envelopes

src/
├── app/                    Routes only — thin pages that load data and compose views
│   ├── (auth)/login/       Shared login page for both roles
│   ├── api/                Route Handlers: the browser's only backend
│   │   ├── auth/           login + logout
│   │   └── admin/          H&S import + user/permission management (admin only)
│   ├── admin/              Admin section
│   └── salesman/           Salesman section
├── components/
│   ├── ui/                 shadcn/ui primitives (generated)
│   ├── layout/             AppShell, sidebar, top bar, mobile drawer, brand mark
│   └── common/             PageHeader, DataTable, StatCard, EmptyState,
│                           MonthSelector/MonthFilter, IntegrationStatus
├── features/               One folder per domain: column contracts + views
│   └── shared/page-data.ts Server-side page loaders
├── services/               Server-side domain API (the only caller of the transport)
├── proxy.ts                Route protection (Next 16 Proxy, Node runtime)
├── lib/
│   ├── api/                Transport, envelope, errors, action registry, load(), cache
│   ├── import/             H&S Excel/CSV reader + report parser (fully tested)
│   ├── auth/               Signed session, cookie config, getCurrentUser()
│   └── utils/              Pure period and formatting helpers
├── config/                 env, constants (sheet schema), routes, navigation
└── types/                  One file per entity, matching the sheet columns exactly
```

See [`docs/architecture.md`](docs/architecture.md) for the data model, the
month-wise partitioning rules, the request path and the action contract.

## Signing in

There is no sign-up page. Accounts are created by an administrator from the
Apps Script editor — see **Creating users** in
[`apps-script/README.md`](apps-script/README.md). The first ADMIN must be
created there before anyone can log in.

Both roles use the same `/login` page; the role comes from the user record and
decides which dashboard you land on. Sessions last 8 hours and live in an
httpOnly cookie.

## Current status

**Step 1 (foundation)**, **Step 2 (Sheets database + Apps Script backend)** and
**Step 3 (authentication)** and **Step 4 (H&S import)** are complete.

Working end to end: `parties.list`, `collections.list`, `followUps.list` and
`reports.availablePeriods`, surfaced on the Parties, Collections, Follow-ups and
Monthly Reports screens, with a URL-driven month filter.

Login, logout, signed sessions and role-based route protection are working:
`/admin/*` and `/salesman/*` are protected server-side, and a salesman cannot
reach the admin area.

An admin can import the H&S outstanding export at `/admin/outstanding`:
upload the H&S .xls or .xlsx as-is, review the parsed preview and any errors,
then confirm. The
import replaces the `HNS_Outstanding` snapshot and touches nothing else.

An admin manages accounts and permission flags at `/admin/users`: create,
edit, activate/deactivate, change passwords, and set the nine per-user
permission flags. Passwords are never returned by any API response.

**Not built yet:** salesman data scoping (a signed-in salesman still sees all
parties and collections) and enforcement of the permission flags, any collection or follow-up
create/edit/delete, month closing, monthly summary calculations, and the admin
user-management UI. Screens for those show an explicit status panel rather than
placeholder data.
