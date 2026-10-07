"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { isSnapshot, type CrashSnapshot } from "./rules";

// The round as RemnaWeb runs it, the same for every viewer: GET /api/sni/crash/stream through this site's proxy,
// as server-sent events. Every message carries RemnaWeb's clock, so the chart runs in step with it, whatever the
// clock of this device says.

/** RemnaWeb is full of viewers: the next try waits this long, ms. */
const FULL_RETRY_MS = 15_000;
/** The stream broke for good (an error answer, not a dropped connection the browser retries itself), ms. */
const RETRY_MS = 3_000;
/** Clock samples kept: the freshest ones follow a drifting clock. */
const SAMPLES = 8;

export type CrashStream = {
  /** The last state; null until the first one comes. */
  snapshot: CrashSnapshot | null;
  /** Whether the stream is connected. */
  online: boolean;
  /** Whether RemnaWeb turned this viewer away: too many already. */
  full: boolean;
  /** RemnaWeb's clock now, ms. */
  serverNow: () => number;
};

export function useCrashStream(): CrashStream {
  const [snapshot, setSnapshot] = useState<CrashSnapshot | null>(null);
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
    if (isSnapshot(data)) setSnapshot(data);
  });

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      source = new EventSource("/api/sni/crash/stream");
      source.onopen = () => {
        setOnline(true);
        setFull(false);
      };
      source.onmessage = (e) => receive(e.data as string);
      source.addEventListener("full", () => {
        source?.close();
        setOnline(false);
        setFull(true);
        retry = setTimeout(open, FULL_RETRY_MS);
      });
      source.onerror = () => {
        setOnline(false);
        // A dropped connection is retried by the browser; an error answer closes the source for good.
        if (source?.readyState === EventSource.CLOSED) retry = setTimeout(open, RETRY_MS);
      };
    };
    open();
    return () => {
      clearTimeout(retry);
      source?.close();
    };
  }, []);

  const serverNow = useCallback(() => Date.now() + offset.current, []);
  return { snapshot, online, full, serverNow };
}

/**
 * `serverNow()` on every animation frame while `active`, else once. In between it runs on the frame's own clock and only
 * eases toward `serverNow()`, never back: `Date.now()` steps in whole milliseconds and the offset to the server jumps
 * when a new sample lands, either of which makes the curve's tip shake.
 */
export function useFrameNow(serverNow: () => number, active: boolean): number {
  const [now, setNow] = useState(serverNow);
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
      setNow(shown);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [serverNow, active]);
  return now;
}
