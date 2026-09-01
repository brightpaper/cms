import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Client-side router cache.
     *
     * Next 15 changed the `dynamic` default to 0, meaning every navigation
     * refetched the page even when you had just come from it. Every screen here
     * waits on a 2–5 second Apps Script call, so that default made moving back
     * and forth painful. A 30-second window matches the server-side read cache
     * in `src/lib/api/cache.ts`, so both layers go stale together.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
