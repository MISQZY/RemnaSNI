"use client";

import { useServerStream } from "@/core/player/stream";
import { isSnapshot, type DuelsSnapshot } from "./rules";

// The duels as RemnaWeb runs them: GET /api/sni/sacrifice/stream (core/player/stream.ts). Signed in, the stream carries
// the player's queue and fight with their own hand, so it goes with the session's token.

const parse = (data: unknown) => (isSnapshot(data) ? data : null);

export function useDuelsStream() {
  return useServerStream<DuelsSnapshot>("sacrifice/stream", { parse, merge: shared, withToken: true });
}

/**
 * `next` keeping the parts of `prev` it repeats: every change in the lobby, anyone's, sends the whole snapshot, and a
 * fight that has not changed must not re-render (and re-replay) its board. `prev` itself when nothing changed.
 */
function shared(prev: DuelsSnapshot, next: DuelsSnapshot): DuelsSnapshot {
  const same = <T>(a: T, b: T) => a === b || JSON.stringify(a) === JSON.stringify(b);
  const lobby = same(prev.lobby, next.lobby) ? prev.lobby : next.lobby;
  const offer = same(prev.offer, next.offer) ? prev.offer : next.offer;
  const duel = same(prev.duel, next.duel) ? prev.duel : next.duel;
  return lobby === prev.lobby && offer === prev.offer && duel === prev.duel ? prev : { now: next.now, lobby, offer, duel };
}
