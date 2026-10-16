"use client";

import { useServerStream } from "@/core/player/stream";
import { isSnapshot, type CrashSnapshot } from "./rules";

// The round as RemnaWeb runs it, the same for every viewer: GET /api/sni/crash/stream (core/player/stream.ts).

const parse = (data: unknown) => (isSnapshot(data) ? data : null);

export function useCrashStream() {
  return useServerStream<CrashSnapshot>("crash/stream", { parse });
}
