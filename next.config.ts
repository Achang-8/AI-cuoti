import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.GITHUB_PAGES === "true"
    ? { output: "export" as const, basePath: "/AI-cuoti" }
    : {}),
  cacheComponents: process.env.GITHUB_PAGES !== "true",
  partialPrefetching: process.env.GITHUB_PAGES !== "true",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
