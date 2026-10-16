import type { Messages } from "next-intl";
import type { Catalog } from "@/core/game";
import type { Locale } from "./locales";
import en from "../messages/en.json";
import ru from "../messages/ru.json";

// The core's catalog (header, account, session, units), src/core/messages/<locale>.json; each game brings its own in
// its manifest (core/game.ts), and src/games/index.ts puts them all together for the server.

export const CORE_CATALOG = { en, ru } satisfies Catalog;

/**
 * What a page needs in the browser, in `locale`: the core namespaces, and a game's catalog for the pages of a game (its
 * layout knows which, so no lookup can disagree with the game src/proxy.ts served). The rest stays on the server;
 * typed as all messages, since a page asks only for its own.
 */
export function pageMessages(locale: Locale, catalog?: Catalog): Messages {
  return { ...CORE_CATALOG[locale], ...catalog?.[locale] } as unknown as Messages;
}
