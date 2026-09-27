import "server-only";

// A node runs one of the infrastructure games RemnaWeb knows, picked by GAME in its .env. RemnaWeb asks
// every site which one it is (GET /api/sni/game) to list the node under that game in the Mini App.

/** Games this image can run; a new one is added here and in RemnaWeb's lib/games.ts. */
export const GAMES = ["clicker", "snake"] as const;
export type GameId = (typeof GAMES)[number];

const DEFAULT_GAME: GameId = "clicker";

let warned = false;

/** The game of this node from GAME; missing means the flag clicker. Read at request time, like NODE_COUNTRY. */
export function siteGame(): GameId {
  const value = process.env.GAME?.trim().toLowerCase();
  if (!value) return DEFAULT_GAME;
  if ((GAMES as readonly string[]).includes(value)) return value as GameId;
  if (!warned) {
    warned = true;
    console.warn(`Unknown GAME "${value}", running ${DEFAULT_GAME}. Known: ${GAMES.join(", ")}`);
  }
  return DEFAULT_GAME;
}
