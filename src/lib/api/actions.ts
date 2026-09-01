/**
 * The RPC contract between this app and Google Apps Script.
 *
 * Apps Script exposes a single `doPost` endpoint that switches on `action`.
 * These string literals are the only names that endpoint needs to understand,
 * so this file is the checklist for building the backend.
 */
export const API_ACTIONS = {
  users: {
    /** Verifies a username + password against the Users sheet. */
    authenticate: "users.authenticate",
    list: "users.list",
    create: "users.create",
    update: "users.update",
    setActive: "users.setActive",
  },
  parties: {
    list: "parties.list",
    get: "parties.get",
    create: "parties.create",
    update: "parties.update",
    assign: "parties.assign",
    listAssignments: "parties.listAssignments",
  },
  outstanding: {
    list: "outstanding.list",
    listBatches: "outstanding.listBatches",
    import: "outstanding.import",
  },
  collections: {
    list: "collections.list",
    get: "collections.get",
    create: "collections.create",
    update: "collections.update",
    remove: "collections.remove",
  },
  followUps: {
    list: "followUps.list",
    create: "followUps.create",
    update: "followUps.update",
    due: "followUps.due",
  },
  reports: {
    monthlySummary: "reports.monthlySummary",
    partyBreakdown: "reports.partyBreakdown",
    availablePeriods: "reports.availablePeriods",
  },
  permissions: {
    getEffective: "permissions.getEffective",
    update: "permissions.update",
  },
} as const;

type ActionGroup = typeof API_ACTIONS;
type ActionName = {
  [G in keyof ActionGroup]: ActionGroup[G][keyof ActionGroup[G]];
}[keyof ActionGroup];

/** Union of every valid action string, e.g. `"collections.list"`. */
export type ApiAction = ActionName;
