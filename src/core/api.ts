import { toast } from "sonner";
import { tr } from "@/core/i18n/client";
import { session } from "@/core/session";

// RemnaWeb's SNI API as the signed-in player, through this site's own /api/sni proxy (app/api/sni): every game
// calls it through here. A 401 means the session is over: the player is signed out on this device, told so,
// and the call returns null, as it does signed out.

/** A failed call: the HTTP status (0 when RemnaWeb could not be reached) and RemnaWeb's error text, if any. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = {
  method?: "GET" | "POST" | "PUT";
  /** Sent as JSON. */
  body?: unknown;
  /** The node's country: RemnaWeb keeps progress per country (and takes it from the site anyway). */
  country?: string;
  /** Survives the page closing, for a last save. */
  keepalive?: boolean;
};

/** Calls `/api/sni/<path>`; null when signed out. Throws ApiError on any other failure. */
export async function api<T>(path: string, { method = "GET", body, country, keepalive }: Options = {}): Promise<T | null> {
  const token = session.getSnapshot().token;
  if (!token) return null;
  const query = country ? `?${new URLSearchParams({ country })}` : "";
  let res: Response;
  try {
    res = await fetch(`/api/sni/${path}${query}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      keepalive,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, tr()("session.offline"));
  }
  // Only the session this call was made with is over: a newer one may have come meanwhile.
  if (res.status === 401) {
    if (session.getSnapshot().token === token) {
      session.signOut();
      toast(tr()("session.signedOut"), { description: tr()("session.expired") });
    }
    return null;
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: unknown }) | null;
  if (!res.ok) throw new ApiError(res.status, typeof json?.error === "string" ? json.error : tr()("session.tryLater"));
  return json as T;
}
