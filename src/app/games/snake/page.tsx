import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { SnakeSite } from "@/components/snake";
import { Unavailable } from "@/components/unavailable";
import { loadConfig } from "@/lib/config-server";
import { siteCountry } from "@/lib/country";
import { syncUrl } from "@/lib/sync-url";

// The snake, served at / by src/proxy.ts. Its rules come from RemnaWeb with the clicker's.

export default async function SnakePage() {
  await connection();
  const locale = await getLocale();
  const [{ code, name }, config] = await Promise.all([siteCountry(locale), loadConfig()]);

  // Until RemnaWeb has been reached once (or while it is too old to send them) there are no rules to play by.
  if (!config?.snake) return <Unavailable code={code} name={name} />;
  return <SnakeSite code={code} name={name} signIn={syncUrl() !== null} rules={config.snake} />;
}
