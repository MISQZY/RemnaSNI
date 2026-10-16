import "server-only";
import { loadSite } from "@/core/server/site";
import { DEFAULT_GAME, GAME_IDS, type GameId } from "@/games";

/** Ids RemnaWeb picked that this image cannot run, warned about once each. */
const warned = new Set<string>();

/** The games of this node RemnaWeb picked (core/server/site.ts) that this image runs, in the registry's order; none known means the default game alone. */
export async function siteGames(): Promise<GameId[]> {
  const { games } = await loadSite();
  const unknown = games.filter((g) => !(GAME_IDS as readonly string[]).includes(g) && !warned.has(g));
  if (unknown.length) {
    unknown.forEach((g) => warned.add(g));
    console.warn(`RemnaWeb picked games this image cannot run: ${unknown.join(", ")}`);
  }
  const known = GAME_IDS.filter((g) => games.includes(g));
  return known.length ? known : [DEFAULT_GAME];
}
