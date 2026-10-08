import type { NextConfig } from "next";

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
};

export default nextConfig;
