import { syncUrl } from "@/core/remnaweb";

// RemnaWeb is the orchestrator: it picks the game of each node and knows the country of the panel host the
// node stands behind. The server asks it for both (GET /api/sni/site, naming the site by DOMAIN) and keeps
// the answer for a minute, so a switch in RemnaWeb reaches the node without a redeploy. While RemnaWeb is
// down the last answer keeps serving.

/** Games this image can run; a new one is added here and in RemnaWeb's lib/games.ts. */
export const GAMES = ["clicker", "snake"] as const;
export type GameId = (typeof GAMES)[number];

/** What this node runs: the game and the country (lowercase ISO 3166-1 alpha-2, "xx" for none). */
export type Site = { game: GameId; country: string };

const DEFAULT_GAME: GameId = "clicker";

/** Header RemnaWeb knows the site by: its host (SITE_HEADER in RemnaWeb's lib/sni.ts). */
export const SITE_HEADER = "x-sni-site";

const TTL_MS = 60_000;
const TIMEOUT_MS = 5_000;
/** After a failed fetch with nothing cached, requests do not wait on RemnaWeb again for this long. */
const RETRY_MS = 15_000;

const isGame = (v: unknown): v is GameId => (GAMES as readonly unknown[]).includes(v);
const countryOf = (v: unknown) => (typeof v === "string" && /^[a-z]{2}$/.test(v.toLowerCase()) ? v.toLowerCase() : "xx");

/** The host of this site from DOMAIN, the one Caddy serves; null when not set (local development). */
export function siteHost(): string | null {
  const host = process.env.DOMAIN?.trim().toLowerCase();
  return host && /^[a-z0-9.-]+$/.test(host) ? host : null;
}

let warned = false;

/**
 * GAME and NODE_COUNTRY of the node's .env, for a RemnaWeb that cannot tell yet (older than GET /api/sni/site,
 * or not knowing this host) and for local development without DOMAIN. Deprecated: pick the game in RemnaWeb.
 */
function fromEnv(why: string): Site {
  if (!warned) {
    warned = true;
    console.warn(`RemnaWeb did not tell this site's game and country (${why}); using GAME and NODE_COUNTRY of .env`);
  }
  const game = process.env.GAME?.trim().toLowerCase();
  return { game: isGame(game) ? game : DEFAULT_GAME, country: countryOf(process.env.NODE_COUNTRY?.trim()) };
}

let cached: { until: number; site: Site } | null = null;
let loading: Promise<Site> | null = null;

async function ask(): Promise<Site> {
  const base = syncUrl();
  const host = siteHost();
  if (!base || !host) return fromEnv(base ? "DOMAIN is not set" : "REMNAWEB_URL is not set");
  const res = await fetch(`${base}/api/sni/site`, {
    headers: { [SITE_HEADER]: host, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return fromEnv(`RemnaWeb does not know ${host}`);
  if (!res.ok) throw new Error(`RemnaWeb site: ${res.status}`);
  const body = (await res.json()) as { game?: unknown; country?: unknown };
  if (!isGame(body.game)) console.warn(`RemnaWeb picked the game "${String(body.game)}" this image cannot run; running ${DEFAULT_GAME}`);
  return { game: isGame(body.game) ? body.game : DEFAULT_GAME, country: countryOf(body.country) };
}

/** The game and country of this node, as RemnaWeb tells. */
export function loadSite(): Promise<Site> {
  if (cached && Date.now() < cached.until) return Promise.resolve(cached.site);
  loading ??= ask()
    .then((site) => {
      cached = { until: Date.now() + TTL_MS, site };
      return site;
    })
    .catch((err: unknown) => {
      console.error(err);
      // Keep serving the last answer; with none yet, fall back to .env for a short while.
      const site = cached?.site ?? fromEnv("RemnaWeb is unreachable");
      cached = { until: Date.now() + (cached ? TTL_MS : RETRY_MS), site };
      return site;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** The game of this node. */
export async function siteGame(): Promise<GameId> {
  return (await loadSite()).game;
}
