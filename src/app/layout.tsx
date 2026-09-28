import type { Metadata, Viewport } from "next";
import { Inter, Science_Gothic } from "next/font/google";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { I18nProvider } from "@/core/i18n/provider";
import { Toaster } from "@/components/ui/sonner";
import { pageMessages } from "@/core/i18n/messages";
import { siteGame } from "@/core/site";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

// Only what every game shares: fonts, language, footer and toasts. Each game has its own layout under
// app/games/<id> (with its title), which src/proxy.ts serves by the game RemnaWeb picked, so a node loads the
// code of its own game only.

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
// Science Gothic: headings and brand texts (Qzr, site name); Inter for everything else. Both carry Cyrillic.
// next/font has no metrics to fit a fallback to it, so none is adjusted.
const scienceGothic = Science_Gothic({ subsets: ["latin", "cyrillic"], variable: "--font-science-gothic", adjustFontFallback: false });

export const metadata: Metadata = { icons: { icon: "/flag.svg" } };

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
  await connection();
  const [locale, game] = await Promise.all([getLocale(), siteGame()]);
  // Optional: the stub sites stay anonymous unless a footer is asked for.
  const footer = process.env.SITE_FOOTER?.trim();

  return (
    <html lang={locale} className={`${inter.variable} ${scienceGothic.variable}`}>
      <body className="flex min-h-dvh flex-col overflow-x-clip antialiased">
        <I18nProvider locale={locale} messages={pageMessages(locale, game)}>
          {children}
          {footer && <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {footer}</footer>}
          <Toaster position="top-center" />
        </I18nProvider>
      </body>
    </html>
  );
}
