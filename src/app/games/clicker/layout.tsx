import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMessages } from "@/core/i18n/messages";
import { I18nProvider } from "@/core/i18n/provider";
import { gameMetadata, nodePage } from "@/core/page";
import { SiteHeader } from "@/core/ui/site-header";
import { Unavailable } from "@/core/ui/unavailable";
import { ClickerAccount } from "@/games/clicker/account";
import { loadClickerConfig } from "@/games/clicker/config-server";
import { ConfigProvider } from "@/games/clicker/config-provider";
import { GameRuntime } from "@/games/clicker/game-runtime";

// The flag clicker: its rules from RemnaWeb, the header and the runtime that saves and syncs the game.
// Served at / by src/proxy.ts.

export async function generateMetadata(): Promise<Metadata> {
  const [{ name }, t] = await Promise.all([nodePage(), getTranslations("clicker.meta")]);
  return gameMetadata(t("title", { country: name }), t("description", { country: name }));
}

export default async function ClickerLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, code, name, signIn }, config, t] = await Promise.all([nodePage(), loadClickerConfig(), getTranslations("clicker")]);

  // The rules come from RemnaWeb; until it has been reached once there is no game to play.
  if (!config) return <Unavailable code={code} name={name} />;
  return (
    <I18nProvider locale={locale} messages={pageMessages(locale, "clicker")}>
      <ConfigProvider config={config}>
        <SiteHeader code={code} name={name} subtitle={t("subtitle")} account={<ClickerAccount signIn={signIn} />} className="max-w-5xl" />
        {/* Clipped, so tap particles flying off the flag do not stretch the page and make it scroll. */}
        <main className="flex flex-1 flex-col overflow-clip lg:min-h-0">{children}</main>
        <GameRuntime syncEnabled={signIn} country={code} />
      </ConfigProvider>
    </I18nProvider>
  );
}
