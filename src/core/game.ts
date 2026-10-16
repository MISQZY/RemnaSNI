import type { Locale } from "@/core/i18n/locales";

// What a game tells the rest of the site about itself, in src/games/<id>/manifest.ts: the registry (src/games/index.ts)
// lists these, and the proxy, the API proxy, the hub and the catalogs are built from it. The core only knows the shape.

/** A game's texts in every language, under its own top-level namespaces (never shared with another scope). */
export type Catalog = Record<Locale, Record<string, unknown>>;

export type GameManifest = {
  /** Also RemnaWeb's id of the game (its lib/game/games.ts). */
  id: string;
  /** Its icon on the hub, a kebab-case lucide name (core/ui/game-icon.tsx). */
  icon: string;
  /** Public paths under /<id> ("/" is /<id> itself), served from app/games/<id> by src/proxy.ts. */
  routes: readonly string[];
  /** RemnaWeb's /api/sni/* calls the game makes through this site's proxy (app/api/sni); `…/stream` is passed as it comes. */
  api: readonly string[];
  /** Its texts, with `<id>.subtitle` and `<id>.meta.{title,description}` for the hub and the page's title. */
  messages: Catalog;
};

export const defineGame = <const M extends GameManifest>(game: M): M => game;
