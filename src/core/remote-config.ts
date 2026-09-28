import "server-only";
import { connection } from "next/server";
import { REMNAWEB_TIMEOUT_MS, remnaWebUrl, remoteValue } from "@/core/remnaweb";

/**
 * A loader of a game's rules from RemnaWeb's GET /api/sni/config (one answer holds the rules of every game):
 * `parse` takes the game's part out of it, or returns null when it does not have the shape the game relies on.
 * Refreshed every minute, so an admin's tuning reaches the node within a minute; a broken answer (a bug or
 * a tampered response) is refused and the last good rules keep serving, like while RemnaWeb is down. Null
 * only when there have never been any (or REMNAWEB_URL is not set): the game shows the Unavailable stub then.
 * Read at request time, never at build.
 */
export function remoteConfig<T>(name: string, parse: (body: unknown) => T | null): () => Promise<T | null> {
  const get = remoteValue<T | null>({
    async load() {
      const base = remnaWebUrl();
      if (!base) return null;
      const res = await fetch(`${base}/api/sni/config`, { cache: "no-store", signal: AbortSignal.timeout(REMNAWEB_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`RemnaWeb config: ${res.status}`);
      const rules = parse(await res.json());
      if (rules === null) throw new Error(`RemnaWeb config: unexpected shape of the ${name} rules`);
      return rules;
    },
    fallback: () => null,
  });
  return async () => {
    await connection();
    return get();
  };
}
