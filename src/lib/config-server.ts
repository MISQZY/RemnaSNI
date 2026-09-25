import "server-only";
import type { GameConfig } from "@/lib/config";
import { syncUrl } from "@/lib/sync-url";

const TTL_MS = 5 * 60_000;
const TIMEOUT_MS = 5_000;

let cached: { at: number; config: GameConfig } | null = null;
let loading: Promise<GameConfig | null> | null = null;

/**
 * The game config from RemnaWeb, refreshed every few minutes. While RemnaWeb is unreachable the last one
 * received keeps serving; null only when there has never been one (or REMNAWEB_URL is not set).
 */
export async function loadConfig(): Promise<GameConfig | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.config;
  const base = syncUrl();
  if (!base) return null;

  loading ??= (async () => {
    try {
      const res = await fetch(`${base}/api/sni/config`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`RemnaWeb config: ${res.status}`);
      const config = (await res.json()) as GameConfig;
      cached = { at: Date.now(), config };
      return config;
    } catch (err) {
      console.error(err);
      // Keep serving the last config and retry after the TTL, so pages do not wait on every request.
      if (cached) cached = { ...cached, at: Date.now() };
      return cached?.config ?? null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}
