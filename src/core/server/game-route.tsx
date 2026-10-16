import "server-only";
import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { pageMessages } from "@/core/i18n/messages";
import { I18nProvider } from "@/core/i18n/provider";
import { gameMetadata, nodePage } from "@/core/server/page";
import { Unavailable } from "@/core/ui/unavailable";
import type { GameManifest } from "@/core/game";

// The route files of a game (src/app/games/<id>/), the same for every game but its id, rules and site: its title
// and messages in the layout, the game on the page. Served at /<id> by src/proxy.ts.

type Game = Pick<GameManifest, "id" | "messages">;

/** The game's title and description, in the page's language, with the node's country. */
export function gameRouteMetadata(game: Game) {
  return async function generateMetadata(): Promise<Metadata> {
    const [{ name }, t] = await Promise.all([nodePage(), getTranslations(`${game.id}.meta` as never)]);
    const tm = t as unknown as (key: string, values: Record<string, string>) => string;
    return gameMetadata(tm("title", { country: name }), tm("description", { country: name }));
  };
}

/** The layout: the core messages and the game's own. */
export function gameLayout(game: Game) {
  return async function GameLayout({ children }: { children: ReactNode }) {
    const { locale } = await nodePage();
    return (
      <I18nProvider locale={locale} messages={pageMessages(locale, game.messages)}>
        {children}
      </I18nProvider>
    );
  };
}

/** The page: the game's site with its rules from RemnaWeb, or the stand-in until there are any to play by. */
export function gamePage<R>(loadRules: () => Promise<R | null>, Site: ComponentType<{ code: string; name: string; signIn: boolean; rules: R }>) {
  return async function GamePage() {
    const [{ code, name, signIn }, rules] = await Promise.all([nodePage(), loadRules()]);
    // Until RemnaWeb has been reached once (or while it is too old to send them) there are no rules to play by.
    if (!rules) return <Unavailable code={code} name={name} />;
    return <Site code={code} name={name} signIn={signIn} rules={rules} />;
  };
}
