/**
 * Single source of truth for every URL in the app.
 *
 * Components and navigation config must never hard-code path strings — import
 * from here so a route rename is a one-file change.
 */

export const ROUTES = {
  home: "/",
  login: "/login",

  admin: {
    root: "/admin",
    parties: "/admin/parties",
    partyDetails: (partyId: string) => `/admin/parties/${partyId}`,
    collections: "/admin/collections",
    followUps: "/admin/follow-ups",
    reports: "/admin/reports",
    outstanding: "/admin/outstanding",
    users: "/admin/users",
    settings: "/admin/settings",
  },

  salesman: {
    root: "/salesman",
    parties: "/salesman/parties",
    partyDetails: (partyId: string) => `/salesman/parties/${partyId}`,
    collections: "/salesman/collections",
    followUps: "/salesman/follow-ups",
    reports: "/salesman/reports",
    settings: "/salesman/settings",
  },
} as const;

/** Where a user lands immediately after login, based on their role. */
export const ROLE_HOME_ROUTE = {
  admin: ROUTES.admin.root,
  salesman: ROUTES.salesman.root,
} as const;
