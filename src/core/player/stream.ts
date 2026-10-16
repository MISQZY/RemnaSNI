"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useSession } from "@/core/player/session";

// A game's events as RemnaWeb sends them, the same pattern for every game that follows something RemnaWeb runs (the
// crash's rounds, the Sacrifice's duels): GET /api/sni/<game>/stream through this site's proxy, as server-sent events,
// read with fetch so it can go with the session's token. Every message carries RemnaWeb's clock (`now`), so what the
// page shows runs in step with it, whatever the clock of this device says.

/** RemnaWeb is full of viewers (it sends `event: full`): the next try waits this long, ms. */
const FULL_RETRY_MS = 15_000;
/** The stream broke or was refused: the next try waits this long, ms. */
const RETRY_MS = 3_000;
/** Clock samples kept: the freshest ones follow a drifting clock. */
const SAMPLES = 8;

export type ServerStream<T> = {
  /** The last state; null until the first one comes. */
  snapshot: T | null;
  /** Whether the stream is connected. */
  online: boolean;
  /** Whether RemnaWeb turned this viewer away: too many already. */
  full: boolean;
  /** RemnaWeb's clock now, ms. */
  serverNow: () => number;
};

type Options<T> = {
  /** The state in a message, or null for one that is not. */
  parse: (data: unknown) => T | null;
  /** The next state from the last one, e.g. keeping the parts that did not change; the new one by default. */
  merge?: (prev: T, next: T) => T;
  /** Whether the stream is the player's own (sent with the token, opened anew on sign-in and sign-out). */
  withToken?: boolean;
};

/** Follows `path` (an /api/sni/* stream of the game) for as long as the page shows it. */
export function useServerStream<T>(path: string, { parse, merge, withToken = false }: Options<T>): ServerStream<T> {
  const { token: sessionToken } = useSession();
  const token = withToken ? sessionToken : null;
  const [snapshot, setSnapshot] = useState<T | null>(null);
  const [online, setOnline] = useState(false);
  const [full, setFull] = useState(false);
  // How far RemnaWeb's clock is ahead of this one. A message arrives late by the network's delay, never early, so
  // the largest of the recent samples is the closest.
  const samples = useRef<number[]>([]);
  const offset = useRef(0);

  const receive = useEffectEvent((raw: string) => {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const now = (data as { now?: unknown } | null)?.now;
    if (typeof now === "number") {
      samples.current = [...samples.current, now - Date.now()].slice(-SAMPLES);
      offset.current = Math.max(...samples.current);
    }
    const next = parse(data);
    if (next !== null) setSnapshot((prev) => (prev && merge ? merge(prev, next) : next));
  });

  useEffect(() => {
    const stop = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;

    const open = async () => {
      let wait = RETRY_MS;
      try {
        const res = await fetch(`/api/sni/${path}`, {
          headers: { Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          cache: "no-store",
          signal: stop.signal,
        });
        if (!res.ok || !res.body) throw new Error(String(res.status));
        setOnline(true);
        setFull(false);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          // Events end with a blank line; a field per line, `event:` naming any but the plain message.
          let end: number;
          while ((end = buffer.indexOf("\n\n")) >= 0) {
            const lines = buffer.slice(0, end).split("\n");
            buffer = buffer.slice(end + 2);
            const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
            const data = lines
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trimStart())
              .join("\n");
            if (event === "full") {
              setFull(true);
              wait = FULL_RETRY_MS;
            } else if (data) receive(data);
          }
        }
      } catch {
        if (stop.signal.aborted) return;
      }
      setOnline(false);
      if (!stop.signal.aborted) retry = setTimeout(() => void open(), wait);
    };
    void open();
    return () => {
      clearTimeout(retry);
      stop.abort();
    };
  }, [path, token]);

  const serverNow = useCallback(() => Date.now() + offset.current, []);
  return { snapshot, online, full, serverNow };
}

/**
 * Calls `onFrame(now)` on every animation frame while `active`, outside of React's renders: for a canvas, which a
 * render per frame would only slow down. `now` runs on the frame's own clock and only eases toward `serverNow()`,
 * never back: `Date.now()` steps in whole milliseconds and the offset to the server jumps when a new sample lands,
 * either of which makes a moving line shake.
 */
export function useFrameLoop(serverNow: () => number, active: boolean, onFrame: (now: number) => void) {
  const frameEvent = useEffectEvent(onFrame);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let shown = 0;
    let last = 0;
    const tick = (t: number) => {
      const target = serverNow();
      const step = shown ? shown + (t - last) : target;
      shown = Math.max(shown, step + (target - step) * 0.1);
      last = t;
      frameEvent(shown);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [serverNow, active]);
}

/** How often text that follows the clock (a multiplier, a countdown) is rendered again, ms. */
const TEXT_MS = 50;

/**
 * `serverNow()` for what React renders, read again every TEXT_MS while `active`, else once: twenty times a second is
 * smooth for a number, and a render on every frame (60, 144 a second) is not worth it. Never goes back.
 */
export function useFrameNow(serverNow: () => number, active: boolean): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow((shown) => Math.max(shown, serverNow()));
    tick();
    const timer = setInterval(tick, TEXT_MS);
    return () => clearInterval(timer);
  }, [serverNow, active]);
  return now;
}

/** Seconds left until `deadline` by RemnaWeb's clock, ticking every quarter second; null without one. */
export function useSecondsLeft(deadline: number | null, serverNow: () => number): number | null {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => setNow(serverNow()), 250);
    return () => clearInterval(id);
  }, [deadline, serverNow]);
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
}
