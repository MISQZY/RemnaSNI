import "server-only";
import { connection } from "next/server";
import { REMNAWEB_TIMEOUT_MS, remnaWebUrl, remoteValue } from "@/core/server/remnaweb";

// One network request and cache for the complete response, independent of how many games use it.
const loadConfig = remoteValue<unknown>({
  async load() {
    const base = remnaWebUrl();
    if (!base) return null;
    const res = await fetch(base + "/api/sni/config", { cache: "no-store", signal: AbortSignal.timeout(REMNAWEB_TIMEOUT_MS) });
    if (!res.ok) throw new Error("RemnaWeb config: " + res.status);
    const body: unknown = await res.json();
    if (!body || typeof body !== "object") throw new Error("RemnaWeb config: unexpected shape");
    return body;
  },
  fallback: () => null,
});

/** Each game keeps its own last valid rules while sharing the response and in-flight request. */
export function remoteConfig<T>(name: string, parse: (body: unknown) => T | null): () => Promise<T | null> {
  let good: T | null = null;
  let previous: unknown;
  return async () => {
    await connection();
    const body = await loadConfig();
    if (body === previous) return good;
    previous = body;
    try {
      const rules = parse(body);
      if (rules !== null) good = rules;
      else if (body !== null) console.error("RemnaWeb config: unexpected shape of the " + name + " rules");
    } catch (err) {
      console.error("RemnaWeb config: could not parse the " + name + " rules", err);
    }
    return good;
  };
}
