import { REMNAWEB_TIMEOUT_MS, remnaWebUrl, remoteValue } from "@/core/server/remnaweb";

// RemnaWeb is the orchestrator: it picks the games of each node and knows the country of the panel host the
// node stands behind. The server asks it for both (GET /api/sni/site, naming the site by DOMAIN) and keeps
// the answer for a minute, so a switch in RemnaWeb reaches the node without a redeploy. While RemnaWeb is
// down the last answer keeps serving.

/**
 * What this node runs: the ids of its games as RemnaWeb names them (src/games/site.ts keeps those this image has, side
 * by side: the hub at / lists them, each is at /<id>), and the country (lowercase ISO 3166-1 alpha-2, "xx" for none).
 */
export type Site = { games: string[]; country: string };

/** Header RemnaWeb knows the site by: its host (SITE_HEADER in RemnaWeb's lib/game/sni.ts). */
export const SITE_HEADER = "x-sni-site";

/** The game ids of `list`: lowercase words. */
const gamesOf = (list: readonly unknown[]): string[] => list.filter((g): g is string => typeof g === "string" && /^[a-z0-9-]+$/.test(g));

const countryOf = (v: unknown) => (typeof v === "string" && /^[a-z]{2}$/.test(v.toLowerCase()) ? v.toLowerCase() : "xx");

/** The host of this site from DOMAIN, the one Caddy serves; null when not set (local development). */
export function siteHost(): string | null {
  const host = process.env.DOMAIN?.trim().toLowerCase();
  return host && /^[a-z0-9.-]+$/.test(host) ? host : null;
}

let warned = false;

/**
 * GAME (one game id, or several comma-separated) and NODE_COUNTRY of the node's .env, for a RemnaWeb that cannot tell yet (older than GET /api/sni/site,
 * or not knowing this host) and for local development without DOMAIN. Deprecated: pick the game in RemnaWeb.
 */
function fromEnv(why: string): Site {
  if (!warned) {
    warned = true;
    console.warn(`RemnaWeb did not tell this site's games and country (${why}); using GAME and NODE_COUNTRY of .env`);
  }
  const games = (process.env.GAME ?? "").split(",").map((g) => g.trim().toLowerCase());
  return { games: gamesOf(games), country: countryOf(process.env.NODE_COUNTRY?.trim()) };
}

async function ask(): Promise<Site> {
  const base = remnaWebUrl();
  const host = siteHost();
  if (!base || !host) return fromEnv(base ? "DOMAIN is not set" : "REMNAWEB_URL is not set");
  const res = await fetch(`${base}/api/sni/site`, {
    headers: { [SITE_HEADER]: host, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(REMNAWEB_TIMEOUT_MS),
  });
  if (res.status === 404) return fromEnv(`RemnaWeb does not know ${host}`);
  if (!res.ok) throw new Error(`RemnaWeb site: ${res.status}`);
  const body = (await res.json()) as { games?: unknown; game?: unknown; country?: unknown };
  // A RemnaWeb older than the hub of games names one game.
  const list: unknown[] = Array.isArray(body.games) ? body.games : [body.game];
  return { games: gamesOf(list), country: countryOf(body.country) };
}

/** The games and country of this node, as RemnaWeb tells; with no answer yet, .env's for a short while. */
export const loadSite = remoteValue({ load: ask, fallback: () => fromEnv("RemnaWeb is unreachable"), retryMs: 15_000 });
