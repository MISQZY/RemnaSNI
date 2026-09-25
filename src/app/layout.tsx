import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { ConfigProvider } from "@/components/config-provider";
import { GameRuntime } from "@/components/game-runtime";
import { I18nProvider } from "@/components/i18n-provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { loadConfig } from "@/lib/config-server";
import { nodeCountry } from "@/lib/country";
import { dictionaries } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { syncUrl } from "@/lib/sync-url";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const locale = await getLocale();
  const { name } = nodeCountry(locale);
  const { meta } = dictionaries[locale];
  return {
    title: { default: meta.title(name), template: `%s · ${meta.title(name)}` },
    description: meta.description(name),
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
  const remnaweb = syncUrl();
  const config = await loadConfig();

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-dvh flex-col overflow-x-clip antialiased">
        <I18nProvider locale={locale}>
          {config ? (
            <ConfigProvider config={config}>
              <SiteHeader code={code} name={name} account={!!remnaweb} />
              <main className="flex-1">{children}</main>
              <GameRuntime syncUrl={remnaweb} country={code} />
            </ConfigProvider>
          ) : (
            // The rules come from RemnaWeb; until it has been reached once there is no game to play.
            <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
              <span className={`fi fi-${code} rounded-md text-7xl shadow-md`} />
              <h1 className="text-xl font-semibold">{name}</h1>
              <p className="max-w-sm text-sm text-muted-foreground">{dictionaries[locale].unavailable}</p>
            </main>
          )}
          <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MISQZY.net</footer>
          <Toaster position="top-center" />
        </I18nProvider>
      </body>
    </html>
  );
}
