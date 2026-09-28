"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { api } from "@/core/api";
import { session, useSession, type Account } from "@/core/session";

/** What RemnaWeb sends with every game's status: the player, and a renewed session when the current one gets old. */
export type StatusExtras = { user: Account; session?: string | null };

/**
 * A game's status from RemnaWeb (`GET /api/sni/<path>`, core/api.ts) for the signed-in player: loaded when the page
 * opens, on sign-in and when the Mini App frame hands over its session. It starts the session (core/session.ts) and
 * keeps a renewed token and the account for the header.
 *
 * `status` is null until loaded and while signed out; `setStatus` takes the answers of the game's other calls.
 * `loaded` is the last answer of the status call itself, with what only it carries (e.g. the looks bought), for an
 * effect that runs once per load.
 */
export function useGameStatus<T extends object>(path: string, country: string) {
  const [status, setStatus] = useState<T | null>(null);
  const [loaded, setLoaded] = useState<(T & StatusExtras) | null>(null);

  const load = useEffectEvent(async () => {
    try {
      const res = await api<T & StatusExtras>(path, { country });
      if (res) {
        if (res.session) session.keep(res.session);
        session.setAccount(res.user);
      }
      setStatus(res);
      setLoaded(res);
    } catch {
      // The balance just stays hidden; playing works without it.
    }
  });

  useEffect(() => {
    const stop = session.start(() => void load());
    // After the effect: the status arrives asynchronously anyway.
    void Promise.resolve().then(() => load());
    return stop;
  }, []);

  // Signed out on this device (here or by an expired session): the account's status goes.
  const { token } = useSession();
  return { status: token ? status : null, setStatus, loaded: token ? loaded : null };
}
