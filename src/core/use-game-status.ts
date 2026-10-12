"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * effect that runs once per load. `reload` asks again: after a call whose answer was lost on the way, the server
 * may have done what it asked (a bet taken, a fish paid) without the page knowing.
 */
export function useGameStatus<T extends object>(path: string, country: string) {
  const [status, setStatus] = useState<T | null>(null);
  const [loaded, setLoaded] = useState<(T & StatusExtras) | null>(null);
  /** The latest load: an answer to an older one, come late, must not undo a newer one. */
  const latest = useRef(0);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    const n = ++latest.current;
    if (retry.current) clearTimeout(retry.current);
    retry.current = null;
    const attempt = async (tries: number) => {
      try {
        const res = await api<T & StatusExtras>(path, { country });
        if (n !== latest.current) return;
        if (res) {
          if (res.session) session.keep(res.session);
          session.setAccount(res.user);
        }
        setStatus(res);
        setLoaded(res);
      } catch {
        // Playing works without the balance; it is asked for again a few times, ever later, rather than left out.
        if (n === latest.current && tries < RETRY_MS.length) retry.current = setTimeout(() => void attempt(tries + 1), RETRY_MS[tries]);
      }
    };
    void attempt(0);
  }, [path, country]);

  useEffect(() => {
    const stop = session.start(load);
    // After the effect: the status arrives asynchronously anyway.
    void Promise.resolve().then(load);
    return () => {
      stop();
      if (retry.current) clearTimeout(retry.current);
    };
  }, [load]);

  // Signed out on this device (here or by an expired session): the account's status goes.
  const { token } = useSession();
  return { status: token ? status : null, setStatus, loaded: token ? loaded : null, reload: load };
}

/** Waits before asking for a status that did not come again. */
const RETRY_MS = [2_000, 5_000, 15_000];
