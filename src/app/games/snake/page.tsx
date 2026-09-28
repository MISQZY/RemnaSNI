import { connection } from "next/server";
import { SnakeSite } from "@/components/snake";
import { nodeCountry } from "@/lib/country";
import { getLocale } from "next-intl/server";
import { syncUrl } from "@/lib/sync-url";

// The snake (GAME=snake), served at / by src/proxy.ts.

export default async function SnakePage() {
  await connection();
  const { code, name } = nodeCountry(await getLocale());
  return <SnakeSite code={code} name={name} signIn={syncUrl() !== null} />;
}
