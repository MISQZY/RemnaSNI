import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { GameRuntime } from "@/components/game-runtime";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { nodeCountry } from "@/lib/country";
import { syncUrl } from "@/lib/sync-url";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { name } = nodeCountry();
  return {
    title: { default: `${name} Flag Clicker`, template: `%s · ${name} Flag Clicker` },
    description: `Tap the flag of ${name}, earn points, buy upgrades and collect achievements.`,
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
  const { code, name } = nodeCountry();
  const remnaweb = syncUrl();

  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-dvh flex-col overflow-x-clip antialiased">
        <SiteHeader code={code} name={name} account={!!remnaweb} />
        <main className="flex-1">{children}</main>
        <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MISQZY.net</footer>
        <GameRuntime syncUrl={remnaweb} country={code} />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
