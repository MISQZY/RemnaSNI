import { connection } from "next/server";
import { ConfigProvider } from "@/components/config-provider";
import { GameRuntime } from "@/components/game-runtime";
import { SiteHeader } from "@/components/site-header";
import { Unavailable } from "@/components/unavailable";
import { loadConfig } from "@/lib/config-server";
import { siteCountry } from "@/lib/country";
import { getLocale } from "next-intl/server";
import { syncUrl } from "@/lib/sync-url";

// The flag clicker: its rules from RemnaWeb, the header with its tabs and the runtime that
// saves and syncs the game. Served at / by src/proxy.ts.

export default async function ClickerLayout({ children }: { children: React.ReactNode }) {
  // The country comes from RemnaWeb at request time, not from the build.
  await connection();
  const locale = await getLocale();
  const { code, name } = await siteCountry(locale);
  const syncEnabled = syncUrl() !== null;
  const config = await loadConfig();

  // The rules come from RemnaWeb; until it has been reached once there is no game to play.
  if (!config) return <Unavailable code={code} name={name} />;
  return (
    <ConfigProvider config={config}>
      <SiteHeader code={code} name={name} account={syncEnabled} />
      {/* Clipped, so tap particles flying off the flag do not stretch the page and make it scroll. */}
      <main className="flex flex-1 flex-col overflow-clip lg:min-h-0">{children}</main>
      <GameRuntime syncEnabled={syncEnabled} country={code} />
    </ConfigProvider>
  );
}
