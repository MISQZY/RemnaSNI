// The games this image can run: the one place that lists them. A game's code lives in src/games/<id>, its
// pages in src/app/games/<id> and its texts in messages/<id>; the core never imports a game.

export const GAMES = {
  clicker: {
    /** Public paths, served from app/games/<id> by src/proxy.ts. */
    routes: ["/"],
    /** RemnaWeb's /api/sni/* calls the game makes through this site's proxy (app/api/sni). */
    api: ["progress", "challenge"],
  },
  snake: {
    routes: ["/"],
    api: ["snake", "snake/perks"],
  },
  fishing: {
    routes: ["/"],
    api: ["fishing", "fishing/cast", "fishing/catch", "fishing/perks"],
  },
} as const satisfies Record<string, { routes: readonly string[]; api: readonly string[] }>;

/** A game id, also known to RemnaWeb (its lib/games.ts): a new one is added there too. */
export type GameId = keyof typeof GAMES;

/** What the sites run until an admin picks a game in RemnaWeb. */
export const DEFAULT_GAME: GameId = "clicker";

export const isGame = (v: unknown): v is GameId => typeof v === "string" && Object.hasOwn(GAMES, v);

/** Calls every game makes: the session's own. */
export const CORE_API = ["auth/logout"] as const;
