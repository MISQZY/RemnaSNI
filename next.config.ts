import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // The favicon route reads the flag SVG from disk at runtime.
  outputFileTracingIncludes: { "/flag.svg": ["./node_modules/flag-icons/flags/1x1/*.svg"] },
};

export default nextConfig;
