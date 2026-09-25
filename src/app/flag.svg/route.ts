import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { nodeCountry } from "@/lib/country";

/** Square flag of the node's country, used as the favicon. */
export async function GET() {
  await connection();
  const { code } = nodeCountry();
  // Bundled into the standalone output via outputFileTracingIncludes in next.config.ts.
  const svg = await readFile(path.join(process.cwd(), "node_modules/flag-icons/flags/1x1", `${code}.svg`));
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
