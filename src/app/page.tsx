import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ScrollArea } from "@/components/ui/scroll-area";
import { gameMetadata, nodePage } from "@/core/server/page";
import { GAMES } from "@/games";
import { siteGames } from "@/games/site";
import { GameIcon } from "@/core/ui/game-icon";
import { GamePreview } from "@/core/ui/game-preview";
import { AccountMenu } from "@/core/ui/account-menu";
import { SiteHeader } from "@/core/ui/site-header";

// The hub at /: the games this node runs (picked in RemnaWeb, src/games/site.ts), each a card linking to its own
// path, served by src/proxy.ts. A server page with the games' names and drawn scenes only: it loads the code of none of them.

export async function generateMetadata(): Promise<Metadata> {
  const [{ name }, t] = await Promise.all([nodePage(), getTranslations("hub.meta")]);
  return gameMetadata(t("title", { country: name }), t("description", { country: name }));
}

export default async function Hub() {
  const [{ code, name, signIn }, games, t] = await Promise.all([nodePage(), siteGames(), getTranslations()]);
  // Every game's messages are on the server; only the name and the line of each are read here (its tagline: the
  // header already names the country, which the page's meta description adds for search).
  const tm = t as unknown as (key: string, values?: Record<string, string>) => string;

  return (
    // Held to the window: the header stays, the tiles of the games scroll under it, as many in a row as fit.
    <div className="flex h-dvh flex-col">
      <SiteHeader code={code} name={name} subtitle={t("hub.subtitle")} account={<AccountMenu signIn={signIn} />} className="max-w-5xl" />
      {/* The gap under the header is inside the list: the viewport clips, and the cards' rings are drawn outside them. */}
      <ScrollArea className="flex min-h-0 flex-1 flex-col" viewportClassName="h-auto min-h-0 flex-1 overscroll-contain">
        <main className="mx-auto grid w-full max-w-5xl gap-4 px-4 pt-6 pb-10 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((id) => (
            <Link
              key={id}
              href={`/${id}`}
              className="group overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow outline-none hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* The game's drawn scene; a game without one shows its icon in its place. */}
              {/* Hover brightens the scene and brings it a little closer, as on the games of RemnaWeb's home page. */}
              <div className="h-36 overflow-hidden border-b bg-muted/40 text-muted-foreground transition-[color,background-color] duration-300 group-hover:bg-muted/70 group-hover:text-foreground/75">
                <GamePreview id={id} className="size-full transition-[scale] duration-300 motion-safe:group-hover:scale-[1.03]" />
                <span className="hidden size-full items-center justify-center text-primary only:flex">
                  <GameIcon name={GAMES[id].icon} className="size-8" />
                </span>
              </div>
              <div className="p-4">
                <span className="flex items-center gap-2 font-heading text-lg font-semibold">
                  {tm(`${id}.subtitle`)}
                  <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-primary" />
                </span>
                <span className="mt-1 block text-sm text-pretty text-muted-foreground">{tm(`${id}.tagline`)}</span>
              </div>
            </Link>
          ))}
        </main>
      </ScrollArea>
    </div>
  );
}
