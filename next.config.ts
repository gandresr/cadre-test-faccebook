import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle in `.next/standalone/` so the
  // production Docker image can run `node server.js` without copying
  // `node_modules`. See https://nextjs.org/docs/app/api-reference/next-config-js/output.
  output: "standalone",
};

export default nextConfig;
