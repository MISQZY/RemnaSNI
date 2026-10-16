import type { Catalog } from "@/core/game";
import { CORE_CATALOG } from "@/core/i18n/messages";
import { LOCALES, type Locale } from "@/core/i18n/locales";
import { clickerGame } from "./clicker/manifest";
import { crashGame } from "./crash/manifest";
import { fishingGame } from "./fishing/manifest";
import { gemsGame } from "./gems/manifest";
import { sacrificeGame } from "./sacrifice/manifest";
import { snakeGame } from "./snake/manifest";

// The games this image can run: the one place that lists them, each by its manifest (src/games/<id>/manifest.ts). The
// proxy, the API proxy, the hub and the catalogs are built from here; the core never imports a game. Server code
// only: the manifests carry every game's texts.

/** In the order the hub lists them. */
export const GAME_LIST = [clickerGame, snakeGame, fishingGame, crashGame, sacrificeGame, gemsGame] as const;

type AnyGame = (typeof GAME_LIST)[number];

/** A game id, also known to RemnaWeb (its lib/game/games.ts): a new one is added there too. */
export type GameId = AnyGame["id"];

export const GAMES = Object.fromEntries(GAME_LIST.map((g) => [g.id, g])) as { [G in AnyGame as G["id"]]: G };

export const GAME_IDS: readonly GameId[] = GAME_LIST.map((g) => g.id);

/** What the sites run until an admin picks a game in RemnaWeb. */
export const DEFAULT_GAME: GameId = "clicker";

export const isGame = (v: unknown): v is GameId => typeof v === "string" && Object.hasOwn(GAMES, v);

type Intersect<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/** Every message: the core's and every game's; the scopes never share a top-level key (messages.test.ts). */
export type Messages = (typeof CORE_CATALOG)["en"] & Intersect<AnyGame["messages"]["en"]>;

/** The catalogs by scope: the core's and each game's. */
export const CATALOGS: Record<string, Catalog> = { core: CORE_CATALOG, ...Object.fromEntries(GAME_LIST.map((g) => [g.id, g.messages])) };

/** Every message, for the server. */
export const MESSAGES = Object.fromEntries(
  LOCALES.map((l) => [l, Object.assign({}, ...Object.values(CATALOGS).map((c) => c[l]))]),
) as Record<Locale, Messages>;
