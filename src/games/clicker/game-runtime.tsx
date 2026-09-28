"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { formatDuration, formatNumber } from "@/core/format";
import { game } from "@/games/clicker/game";
import { currentLocale, tr } from "@/core/i18n/client";
import { sync } from "@/games/clicker/sync";

/** How often passive income from the turbo is credited; it is counted by the time passed, so a second is enough. */
const TICK_MS = 1_000;

export function useGame() {
  return useSyncExternalStore(game.subscribe, game.getSnapshot, game.getServerSnapshot);
}

export function useSync() {
  return useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getServerSnapshot);
}

/**
 * Loads the saved game and persists it when the page hides.
 * With `syncEnabled` (REMNAWEB_URL set on the server) it also keeps the progress of a signed-in player in sync.
 */
export function GameRuntime({ syncEnabled, country }: { syncEnabled: boolean; country: string }) {
  useEffect(() => {
    const away = game.hydrate();
    if (away.gain >= 1 && away.seconds >= 60) {
      const locale = currentLocale();
      const t = tr();
      toast.success(t("clicker.welcomeBack"), {
        description: t("clicker.awayIncome", { points: formatNumber(away.gain, false, locale), time: formatDuration(away.seconds, locale) }),
      });
    }
    // Hidden tabs skip the ticks: the income is credited by the time passed once the tab is back.
    const ticker = setInterval(() => document.visibilityState === "visible" && game.tick(), TICK_MS);
    const stopSync = syncEnabled ? sync.start(country) : null;

    const onHide = () => document.visibilityState === "hidden" && game.save();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", game.save);
    return () => {
      clearInterval(ticker);
      stopSync?.();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", game.save);
      game.save();
    };
  }, [syncEnabled, country]);

  return null;
}
