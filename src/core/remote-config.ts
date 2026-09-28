import "server-only";
import { isGameConfig, withDefaults, type GameConfig } from "@/games/clicker/config";
import { syncUrl } from "@/core/remnaweb";

/** Short: an admin may tune the numbers in RemnaWeb, and its progress checks follow them at once. */
const TTL_MS = 60_000;
const TIMEOUT_MS = 5_000;

/** After a failed fetch with nothing cached, pages do not wait on RemnaWeb again for this long. */
const RETRY_MS = 30_000;

let cached: { at: number; config: GameConfig } | null = null;
let failedAt = 0;
let loading: Promise<GameConfig | null> | null = null;

/**
 * The game config from RemnaWeb, refreshed every minute. While RemnaWeb is unreachable the last one
 * received keeps serving; null only when there has never been one (or REMNAWEB_URL is not set).
 */
export async function loadConfig(): Promise<GameConfig | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.config;
  const base = syncUrl();
  if (!base) return null;
  if (!cached && Date.now() - failedAt < RETRY_MS) return null;

  loading ??= (async () => {
    try {
      const res = await fetch(`${base}/api/sni/config`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`RemnaWeb config: ${res.status}`);
      const body: unknown = await res.json();
      if (!isGameConfig(body)) throw new Error("RemnaWeb config: unexpected shape");
      const config = withDefaults(body);
      cached = { at: Date.now(), config };
      return config;
    } catch (err) {
      console.error(err);
      // Keep serving the last config and retry after the TTL, so pages do not wait on every request.
      if (cached) cached = { ...cached, at: Date.now() };
      else failedAt = Date.now();
      return cached?.config ?? null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}
