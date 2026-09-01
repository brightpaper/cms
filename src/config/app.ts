import { publicEnv } from "@/config/env";

export const APP_CONFIG = {
  name: publicEnv.appName,
  shortName: "BP CMS",
  description:
    "Collection Management System for Bright Paper — party outstanding, collections, follow-ups and month-wise reporting.",
  company: "Bright Paper",
} as const;
