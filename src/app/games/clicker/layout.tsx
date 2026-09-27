import { connection } from "next/server";
import { ConfigProvider } from "@/components/config-provider";
import { GameRuntime } from "@/components/game-runtime";
import { SiteHeader } from "@/components/site-header";
import { loadConfig } from "@/lib/config-server";
import { nodeCountry } from "@/lib/country";
import { dictionaries } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { syncUrl } from "@/lib/sync-url";

// The flag clicker (GAME=clicker): its rules from RemnaWeb, the header with its tabs and the runtime that
// saves and syncs the game. Served at / by src/proxy.ts.

export default async function ClickerLayout({ children }: { children: React.ReactNode }) {
  // NODE_COUNTRY comes from the container at request time, not from the build.
  await connection();
  const locale = await getLocale();
  const { code, name } = nodeCountry(locale);
  const syncEnabled = syncUrl() !== null;
  const config = await loadConfig();

  if (!config) {
    // The rules come from RemnaWeb; until it has been reached once there is no game to play.
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <span className={`fi fi-${code} rounded-md text-7xl shadow-md`} />
        <h1 className="text-xl font-semibold">{name}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{dictionaries[locale].unavailable}</p>
      </main>
    );
  }
  return (
    <ConfigProvider config={config}>
      <SiteHeader code={code} name={name} account={syncEnabled} />
      {/* Clipped, so tap particles flying off the flag do not stretch the page and make it scroll. */}
      <main className="flex flex-1 flex-col overflow-clip lg:min-h-0">{children}</main>
      <GameRuntime syncEnabled={syncEnabled} country={code} />
    </ConfigProvider>
  );
}
