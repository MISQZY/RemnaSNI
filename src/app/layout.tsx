import type { Metadata, Viewport } from "next";
import { Inter, Science_Gothic } from "next/font/google";
import { connection } from "next/server";
import { ConfigProvider } from "@/components/config-provider";
import { GameRuntime } from "@/components/game-runtime";
import { I18nProvider } from "@/components/i18n-provider";
import { SiteHeader } from "@/components/site-header";
import { SnakeSite } from "@/components/snake";
import { Toaster } from "@/components/ui/sonner";
import { loadConfig } from "@/lib/config-server";
import { nodeCountry } from "@/lib/country";
import { dictionaries } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { siteGame } from "@/lib/site-game";
import { syncUrl } from "@/lib/sync-url";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
// Science Gothic: headings and brand texts (Qzr, site name); Inter for everything else. Both carry Cyrillic.
const scienceGothic = Science_Gothic({ subsets: ["latin", "cyrillic"], variable: "--font-science-gothic" });

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const locale = await getLocale();
  const { name } = nodeCountry(locale);
  const t = dictionaries[locale];
  const snake = siteGame() === "snake";
  const title = snake ? t.snake.title(name) : t.meta.title(name);
  return {
    title: { default: title, template: `%s · ${title}` },
    description: snake ? t.snake.description(name) : t.meta.description(name),
    icons: { icon: "/flag.svg" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // NODE_COUNTRY comes from the container at request time, not from the build.
  await connection();
  const locale = await getLocale();
  const { code, name } = nodeCountry(locale);
  const syncEnabled = syncUrl() !== null;
  const game = siteGame();
  // The clicker's rules come from RemnaWeb; other games do not need them.
  const config = game === "clicker" ? await loadConfig() : null;
  // Optional: the stub sites stay anonymous unless a footer is asked for.
  const footer = process.env.SITE_FOOTER?.trim();

  return (
    <html lang={locale} className={`${inter.variable} ${scienceGothic.variable}`}>
      <body className="flex min-h-dvh flex-col overflow-x-clip antialiased">
        <I18nProvider locale={locale}>
          {/* One game per node, picked by GAME (lib/site-game.ts). */}
          {game === "snake" ? (
            <SnakeSite code={code} name={name} signIn={syncEnabled} />
          ) : config ? (
            <ConfigProvider config={config}>
              <SiteHeader code={code} name={name} account={syncEnabled} />
              {/* Clipped, so tap particles flying off the flag do not stretch the page and make it scroll. */}
              <main className="flex flex-1 flex-col overflow-clip lg:min-h-0">{children}</main>
              <GameRuntime syncEnabled={syncEnabled} country={code} />
            </ConfigProvider>
          ) : (
            // The rules come from RemnaWeb; until it has been reached once there is no game to play.
            <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
              <span className={`fi fi-${code} rounded-md text-7xl shadow-md`} />
              <h1 className="text-xl font-semibold">{name}</h1>
              <p className="max-w-sm text-sm text-muted-foreground">{dictionaries[locale].unavailable}</p>
            </main>
          )}
          {footer && <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {footer}</footer>}
          <Toaster position="top-center" />
        </I18nProvider>
      </body>
    </html>
  );
}
