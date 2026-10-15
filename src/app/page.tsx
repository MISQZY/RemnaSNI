import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { ChartSpline, Fish, Gem, Hand, Skull, Worm } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GameId } from "@/core/games";
import { gameMetadata, nodePage } from "@/core/server/page";
import { siteGames } from "@/core/server/site";
import { AccountMenu } from "@/core/ui/account-menu";
import { SiteHeader } from "@/core/ui/site-header";

// The hub at /: the games this node runs (picked in RemnaWeb, core/server/site.ts), each a card linking to its own
// path, served by src/proxy.ts. A server page with the games' names only: it loads the code of none of them.

/** Icons of the games, the same as in RemnaWeb's game picker. */
const ICONS: Record<GameId, LucideIcon> = { clicker: Hand, snake: Worm, fishing: Fish, crash: ChartSpline, sacrifice: Skull, gems: Gem };

export async function generateMetadata(): Promise<Metadata> {
  const [{ name }, t] = await Promise.all([nodePage(), getTranslations("hub.meta")]);
  return gameMetadata(t("title", { country: name }), t("description", { country: name }));
}

export default async function Hub() {
  const [{ code, name, signIn }, games, t] = await Promise.all([nodePage(), siteGames(), getTranslations()]);
  // Every game's messages are on the server; only the name and description of each are read here.
  const tm = t as unknown as (key: string, values?: Record<string, string>) => string;

  return (
    // Held to the window: the header stays, the list of games scrolls under it, one game a row.
    <div className="flex h-dvh flex-col">
      <SiteHeader code={code} name={name} subtitle={t("hub.subtitle")} account={<AccountMenu signIn={signIn} />} className="max-w-3xl" />
      {/* The gap under the header is inside the list: the viewport clips, and the cards' rings are drawn outside them. */}
      <ScrollArea className="flex min-h-0 flex-1 flex-col" viewportClassName="h-auto min-h-0 flex-1 overscroll-contain">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pt-6 pb-10">
          {games.map((id) => {
            const Icon = ICONS[id];
            return (
              <Link
                key={id}
                href={`/${id}`}
                className="group flex items-start gap-3 rounded-2xl bg-card/80 p-4 ring-1 ring-foreground/10 backdrop-blur-sm transition-colors hover:bg-muted/60 hover:ring-primary/40"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-heading text-lg font-semibold">{tm(`${id}.subtitle`)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{tm(`${id}.meta.description`, { country: name })}</span>
                </span>
              </Link>
            );
          })}
        </main>
      </ScrollArea>
    </div>
  );
}
