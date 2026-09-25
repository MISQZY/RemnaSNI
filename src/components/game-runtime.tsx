"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { formatDuration, formatNumber } from "@/lib/format";
import { game } from "@/lib/game";
import { sync } from "@/lib/sync";

/** How often passive income from the traffic boost is credited. */
const TICK_MS = 250;

export function useGame() {
  return useSyncExternalStore(game.subscribe, game.getSnapshot, game.getServerSnapshot);
}

export function useSync() {
  return useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getServerSnapshot);
}

/**
 * Loads the saved game, persists it when the page hides and announces unlocked achievements.
 * With `syncUrl` (RemnaWeb) it also keeps the progress of a signed-in player in sync.
 */
export function GameRuntime({ syncUrl, country }: { syncUrl: string | null; country: string }) {
  useEffect(() => {
    const away = game.hydrate();
    if (away.gain >= 1 && away.seconds >= 60) {
      toast.success("Welcome back!", {
        description: `Your traffic auto-tapped ${formatNumber(away.gain)} points in ${formatDuration(away.seconds)}.`,
      });
    }
    const ticker = setInterval(game.tick, TICK_MS);
    game.onUnlock((ids) => {
      for (const id of ids) {
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        if (a) toast.success("Achievement unlocked", { description: a.name });
      }
    });
    const stopSync = syncUrl ? sync.start(syncUrl, country) : null;

    const onHide = () => document.visibilityState === "hidden" && game.save();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", game.save);
    return () => {
      clearInterval(ticker);
      stopSync?.();
      game.onUnlock(null);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", game.save);
      game.save();
    };
  }, [syncUrl, country]);

  return null;
}
