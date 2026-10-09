import type { NextConfig } from "next";

// Where the FastAPI server lives. Set in .env.local for development and in Vercel for
// production.
const API_SERVER = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Kept deliberately small. Pages fetch their data in the browser (see src/lib/api.ts),
// so none of Next.js's server caching features are switched on.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      // Lets Tailwind CSS process every stylesheet.
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  /**
   * Requests to /api/... on this site are passed on to the API server, and its reply
   * is passed back. The browser therefore talks to one site only.
   *
   * Why: a page on one site calling an API on another makes the browser ask
   * permission first (an extra "preflight" request before every save). Through this
   * pass-through there is no second site, so no preflight: one trip instead of two.
   */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_SERVER}/api/:path*` }];
  },
};

export default nextConfig;
