import "server-only";

/**
 * Origin of RemnaWeb from REMNAWEB_URL; without it sign-in and sync are hidden. Read at request time and
 * used on the server only. https is required (plain http only to localhost): tokens and the game rules travel over it.
 */
export function remnaWebUrl(): string | null {
  const raw = process.env.REMNAWEB_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return url.protocol === "https:" || (url.protocol === "http:" && local) ? url.origin : null;
  } catch {
    return null;
  }
}

/** How long a request of the server to RemnaWeb may take. */
export const REMNAWEB_TIMEOUT_MS = 5_000;

/**
 * Something the server asks RemnaWeb for and keeps for `ttlMs`, so a change there reaches the node without a
 * redeploy. While RemnaWeb fails, the last good value keeps serving and is asked again after `ttlMs`; with none
 * yet, `fallback()` serves for `retryMs`, so pages do not wait on RemnaWeb on every request. Concurrent calls
 * share one request; `load` throws on a failure.
 */
export function remoteValue<T>({
  load,
  fallback,
  ttlMs = 60_000,
  retryMs = 30_000,
}: {
  load: () => Promise<T>;
  fallback: () => T;
  ttlMs?: number;
  retryMs?: number;
}): () => Promise<T> {
  let good: { value: T } | null = null;
  let cached: { until: number; value: T } | null = null;
  let loading: Promise<T> | null = null;

  return () => {
    if (cached && Date.now() < cached.until) return Promise.resolve(cached.value);
    loading ??= load()
      .then((value) => {
        good = { value };
        cached = { until: Date.now() + ttlMs, value };
        return value;
      })
      .catch((err: unknown) => {
        console.error(err);
        const value = good ? good.value : fallback();
        cached = { until: Date.now() + (good ? ttlMs : retryMs), value };
        return value;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  };
}
