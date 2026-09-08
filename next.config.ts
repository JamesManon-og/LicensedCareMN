import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run typecheck` remains a required verification step. This avoids a
  // Next 16.3 CLI parsing defect in this environment after TypeScript has
  // already successfully completed the same project type check.
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/search.html", destination: "/search", permanent: true },
      { source: "/guide.html", destination: "/guide", permanent: true },
      { source: "/faq.html", destination: "/faq", permanent: true }
    ];
  }
};

export default nextConfig;
