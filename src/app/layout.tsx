import type { Metadata, Viewport } from "next";
import { Inter, Science_Gothic } from "next/font/google";
import { connection } from "next/server";
import { I18nProvider } from "@/components/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { nodeCountry } from "@/lib/country";
import { dictionaries } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { siteGame } from "@/lib/site-game";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

// Only what every game shares: fonts, language, footer and toasts. Each game has its own layout under
// app/games/<id>, which src/proxy.ts serves by GAME, so a node loads the code of its own game only.

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
// Science Gothic: headings and brand texts (Qzr, site name); Inter for everything else. Both carry Cyrillic.
// next/font has no metrics to fit a fallback to it, so none is adjusted.
const scienceGothic = Science_Gothic({ subsets: ["latin", "cyrillic"], variable: "--font-science-gothic", adjustFontFallback: false });

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
  await connection();
  const locale = await getLocale();
  // Optional: the stub sites stay anonymous unless a footer is asked for.
  const footer = process.env.SITE_FOOTER?.trim();

  return (
    <html lang={locale} className={`${inter.variable} ${scienceGothic.variable}`}>
      <body className="flex min-h-dvh flex-col overflow-x-clip antialiased">
        <I18nProvider locale={locale}>
          {children}
          {footer && <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {footer}</footer>}
          <Toaster position="top-center" />
        </I18nProvider>
      </body>
    </html>
  );
}
