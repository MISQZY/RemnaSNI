"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useSession } from "@/core/session";
import { isSnapshot, type DuelsSnapshot } from "./rules";

// The duels as RemnaWeb runs them: GET /api/sni/sacrifice/stream through this site's proxy, as server-sent events.
// Signed in, the stream carries the player's queue and fight with their own hand, so it goes with the session's
// token: read with fetch, since an EventSource cannot send it, and opened anew when the player signs in or out. Every
// message carries RemnaWeb's clock, so the turn counts down in step with it.

const FULL_RETRY_MS = 15_000;
const RETRY_MS = 3_000;
const SAMPLES = 8;

export type DuelsStream = {
  snapshot: DuelsSnapshot | null;
  online: boolean;
  full: boolean;
  serverNow: () => number;
};

export function useDuelsStream(): DuelsStream {
  const { token } = useSession();
  const [snapshot, setSnapshot] = useState<DuelsSnapshot | null>(null);
  const [online, setOnline] = useState(false);
  const [full, setFull] = useState(false);
  // How far RemnaWeb's clock is ahead of this one: a message arrives late, never early, so the largest sample is closest.
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
    const stop = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;

    const open = async () => {
      let wait = RETRY_MS;
      try {
        const res = await fetch("/api/sni/sacrifice/stream", {
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
  }, [token]);

  const serverNow = useCallback(() => Date.now() + offset.current, []);
  return { snapshot, online, full, serverNow };
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
