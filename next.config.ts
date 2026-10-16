import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Caddy compresses (zstd or gzip) in front of the site.
  compress: false,
  // The favicon route reads the flag SVG from disk at runtime.
  outputFileTracingIncludes: { "/flag.svg": ["./node_modules/flag-icons/flags/1x1/*.svg"] },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
