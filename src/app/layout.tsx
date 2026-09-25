import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { GameRuntime } from "@/components/game-runtime";
import { I18nProvider } from "@/components/i18n-provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
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

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-dvh flex-col overflow-x-clip antialiased">
        <I18nProvider locale={locale}>
          <SiteHeader code={code} name={name} account={!!remnaweb} />
          <main className="flex-1">{children}</main>
          <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MISQZY.net</footer>
          <GameRuntime syncUrl={remnaweb} country={code} />
          <Toaster position="top-center" />
        </I18nProvider>
      </body>
    </html>
  );
}
